# Render.yaml Configuration Guide for Abhinayam Silks

## Overview
The `render.yaml` file defines how your Express.js + PostgreSQL application deploys to Render. It specifies:
- Service type (web)
- Runtime (Node.js)
- Environment variables
- Build/start commands
- Health checks

## Step-by-Step Deployment Guide

### 1. **Prerequisites on Render Dashboard**

Before deploying, you need to set up:

#### A. PostgreSQL Database (Neon)
- Render connects to your existing Neon PostgreSQL database
- Connection string: `postgresql://user:password@host/dbname?sslmode=require`
- Your current one: From `.env` file

#### B. Object Storage (S3 Credentials)
- Using Neon Object Storage OR AWS S3
- You already have: `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### 2. **Required Environment Variables to Set in Render Dashboard**

Go to **Render Dashboard > Services > abhinayam-silks > Environment**

| Variable | Value | Where to Get |
|----------|-------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Your `.env` file or Neon dashboard |
| `SESSION_SECRET` | Long random string (32+ chars) | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_PASSWORD` | Your admin password | Choose a strong password |
| `AWS_ACCESS_KEY_ID` | Neon S3 access key | `.env` file |
| `AWS_SECRET_ACCESS_KEY` | Neon S3 secret key | `.env` file |

### 3. **Update Your Code (No Major Changes Needed)**

Your code is **already compatible** with Render! Here's what's already in place:

✅ `config.js` uses environment variables correctly
✅ `server.js` listens on `process.env.PORT` (Render sets this automatically)
✅ Database connection uses `DATABASE_URL`
✅ Session management configured
✅ S3 upload support with credentials

#### Optional: Add Render-Specific Domain Configuration

Update `src/config.js` (already done, but verify):

```javascript
baseUrl: (env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),
```

This automatically uses Render's external URL if `PUBLIC_BASE_URL` is not set.

### 4. **Update Environment Variables in render.yaml**

Edit the file with your actual values:

```yaml
- key: DATABASE_URL
  value: postgresql://user:pwd@ep-xyz.neon.tech/abhinayam?sslmode=require

- key: AWS_BUCKET_NAME
  value: your-neon-bucket-name

- key: AWS_ENDPOINT_URL_S3
  value: https://your-bucket.storage.c-9.us-east-2.aws.neon.tech

- key: AWS_ACCESS_KEY_ID
  value: nak_live_xxx...  # From your .env

- key: AWS_SECRET_ACCESS_KEY
  value: nsk_live_xxx...  # From your .env

- key: ADMIN_PASSWORD
  value: YourStrongPassword123!
```

### 5. **Deployment Steps**

#### Option A: Using Render Dashboard

1. Go to **Render.com** > Dashboard
2. Click **+ New +** > **Web Service**
3. Select your GitHub repository (sravana-bommisetty/Saree-ECommerce)
4. Name: `abhinayam-silks`
5. **Branch**: `main`
6. **Runtime**: Node
7. **Build Command**: `npm install`
8. **Start Command**: `npm start`
9. **Instance Type**: Standard
10. **Environment Variables**: Add all required vars (see Step 2)
11. Click **Deploy**

#### Option B: Using render.yaml (Recommended)

1. Commit `render.yaml` to repository:
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment configuration"
   git push
   ```

2. On Render Dashboard:
   - Click **+ New +** > **Web Service**
   - Select repository
   - Render will auto-detect `render.yaml`
   - Add sensitive environment variables (secrets) in dashboard

3. Click **Deploy**

### 6. **Handling Secrets Properly**

For sensitive values, use Render's **Secrets** feature:

1. In Render Dashboard > **Environment**
2. Click **+ Add Secret**
3. Add:
   - `DATABASE_URL` (contains password)
   - `SESSION_SECRET`
   - `ADMIN_PASSWORD`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

Secrets:
- Are NOT exposed in logs
- Are NOT visible in Dashboard (after set)
- Are available at runtime

### 7. **Verify Deployment**

After deployment:

1. Check **Logs** in Render Dashboard:
   ```
   ✅ Database connected and schema ready
   Abhinayam Silks running at http://localhost:3000
   ```

2. Visit your app: `https://abhinayam-silks-xxx.onrender.com`

3. Test functionality:
   - Admin login: `/admin`
   - Shop page: `/shop`
   - Upload image to test S3 connectivity

### 8. **Possible Issues & Fixes**

#### Issue: "DATABASE_URL not set"
- **Fix**: Add `DATABASE_URL` environment variable in Render Dashboard

#### Issue: "Cannot connect to S3"
- **Check**:
  - S3 credentials are correct in Render
  - Bucket name is correct
  - Endpoint URL matches your bucket

#### Issue: "Session secret invalid"
- **Fix**: Generate new secret:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

#### Issue: Database migrations fail
- **Fix**: Your `db.js` auto-creates schema. First deploy creates tables automatically.

#### Issue: Upload directory not writable
- **Note**: Render ephemeral filesystem. Uploads are lost after app restarts.
- **Solution**: Only use S3 for persistent storage (already configured)

### 9. **Auto-Deployment Setup**

The `render.yaml` includes:
```yaml
autoDeploy: true
```

This means:
- Every push to `main` branch triggers automatic deployment
- No manual deploy button needed
- Logs show deployment status

To disable: Change to `autoDeploy: false` and deploy manually

### 10. **Production Checklist**

Before going live:

- [ ] DATABASE_URL set to production Neon instance
- [ ] SESSION_SECRET is a strong random string (not "change-me-to-...")
- [ ] ADMIN_PASSWORD is strong and stored safely
- [ ] S3 credentials are correct and stored as secrets
- [ ] PUBLIC_BASE_URL points to your actual domain (if using custom domain)
- [ ] All environment variables marked as `scope: runtime` are set
- [ ] Health check path `/` works (returns HTML, not error)
- [ ] Logs show "Database connected and schema ready"
- [ ] Admin login works
- [ ] Product uploads work
- [ ] Images load from S3

### 11. **Code Changes Required (Summary)**

**No changes needed to application code!** Your app is ready because:

✅ `config.js` handles `RENDER_EXTERNAL_URL` fallback
✅ `server.js` reads `PORT` from environment
✅ Database uses `DATABASE_URL`
✅ S3 configured with env variables
✅ Session secret supported
✅ Admin auto-creation on first start

### 12. **Monitoring & Logs**

In Render Dashboard:
- **Logs** tab: See real-time server logs
- **Events** tab: Deployment history
- **Metrics** tab: CPU, memory, bandwidth usage
- **Health** tab: Uptime monitoring

## Quick Reference: Environment Variables

| Variable | Required | Secret | Default | Purpose |
|----------|----------|--------|---------|---------|
| NODE_ENV | Yes | No | development | Environment mode |
| DATABASE_URL | Yes | Yes | — | PostgreSQL connection |
| SESSION_SECRET | Yes | Yes | — | Express session encryption |
| PORT | No | No | 3000 | Express server port |
| PUBLIC_BASE_URL | No | No | RENDER_EXTERNAL_URL or localhost | App public URL |
| ADMIN_USERNAME | No | No | admin | First admin username |
| ADMIN_PASSWORD | No | Yes | — | First admin password |
| AWS_BUCKET_NAME | No | No | — | S3 bucket name |
| AWS_ENDPOINT_URL_S3 | No | No | — | S3 endpoint (Neon) |
| AWS_REGION | No | No | us-east-2 | S3 region |
| AWS_ACCESS_KEY_ID | No | Yes | — | S3 access key |
| AWS_SECRET_ACCESS_KEY | No | Yes | — | S3 secret key |
| WHATSAPP_NUMBER | No | No | 919999999999 | Shop WhatsApp |
| UPI_ID | No | No | abhinayamsilks@upi | UPI payment ID |

## Support

If deployment fails:
1. Check Render Dashboard > Logs
2. Verify all required environment variables are set
3. Check database connection with: `psql $DATABASE_URL`
4. Ensure S3 credentials are correct
5. Contact Render Support: https://render.com/support

---

**Next Step**: Update `.env` values in `render.yaml` and push to repository, then deploy on Render dashboard!
