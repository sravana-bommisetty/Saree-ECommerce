# Render Deployment Checklist for Abhinayam Silks

## Phase 1: Prepare Your Code ✓

- [x] Code is already compatible with Render
- [x] `package.json` has correct `start` script
- [x] `config.js` uses environment variables
- [x] Database uses PostgreSQL (already set)
- [x] S3 upload support built-in
- [x] No hardcoded secrets in code

**Action**: No code changes needed! ✅

---

## Phase 2: Gather Required Information

Before deploying, collect these from your `.env` file:

```
[ ] DATABASE_URL = ___________________________________
    (Example: postgresql://user:pass@host/db)

[ ] AWS_BUCKET_NAME = ___________________________________

[ ] AWS_ENDPOINT_URL_S3 = ___________________________________

[ ] AWS_ACCESS_KEY_ID = ___________________________________

[ ] AWS_SECRET_ACCESS_KEY = ___________________________________

[ ] Generate SESSION_SECRET:
    Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    Result: ___________________________________

[ ] ADMIN_PASSWORD (choose a strong password):
    ___________________________________

[ ] WHATSAPP_NUMBER (keep from .env or update):
    ___________________________________

[ ] UPI_ID (keep from .env or update):
    ___________________________________
```

---

## Phase 3: Configure render.yaml

**File**: `render.yaml` (already created)

Update these values:

```yaml
# DATABASE_URL (CRITICAL)
- key: DATABASE_URL
  value: [YOUR_DATABASE_URL_FROM_ABOVE]

# S3 Configuration
- key: AWS_BUCKET_NAME
  value: [YOUR_BUCKET_NAME]

- key: AWS_ENDPOINT_URL_S3
  value: [YOUR_ENDPOINT_URL]

- key: AWS_ACCESS_KEY_ID
  value: [YOUR_ACCESS_KEY]  # Can use secrets in dashboard instead

- key: AWS_SECRET_ACCESS_KEY
  value: [YOUR_SECRET_KEY]  # Can use secrets in dashboard instead

# Admin
- key: ADMIN_PASSWORD
  value: [YOUR_STRONG_PASSWORD]  # Use secrets in dashboard

# Session
- key: SESSION_SECRET
  value: [YOUR_GENERATED_SESSION_SECRET]  # Use secrets in dashboard

# Contact Info
- key: WHATSAPP_NUMBER
  value: [YOUR_WHATSAPP_NUMBER]

- key: UPI_ID
  value: [YOUR_UPI_ID]
```

---

## Phase 4: Push to GitHub

```bash
cd Abhinayam

# Add new files
git add render.yaml RENDER_DEPLOYMENT_GUIDE.md

# Commit
git commit -m "Add Render deployment configuration"

# Push
git push origin main
```

**Verify**: Files pushed to GitHub

---

## Phase 5: Deploy on Render Dashboard

### Step 1: Create Web Service
1. Go to **https://render.com/dashboard**
2. Click **+ New +** → **Web Service**
3. Search and select: `sravana-bommisetty/Saree-ECommerce`
4. Click **Connect**

### Step 2: Configure Service
- **Name**: `abhinayam-silks`
- **Environment**: `production`
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Standard`

### Step 3: Add Environment Variables

**Option A: Using render.yaml (Automatic)**
- Render auto-reads `render.yaml`
- Still add secrets manually (see below)

**Option B: Manual Entry**
- Copy values from Phase 2
- Add to Render Dashboard > Environment

### Step 4: Add Secrets (Important!)

Click **+ Add Secret** for each:

1. **DATABASE_URL**
   - Value: [Your PostgreSQL connection string]
   - Make sure it includes: `?sslmode=require`

2. **SESSION_SECRET**
   - Value: [Your generated session secret]

3. **ADMIN_PASSWORD**
   - Value: [Your strong password]

4. **AWS_ACCESS_KEY_ID**
   - Value: [From .env]

5. **AWS_SECRET_ACCESS_KEY**
   - Value: [From .env]

**Why Secrets?**
- Not shown in logs
- Not visible in dashboard after creation
- Encrypted at rest and in transit

### Step 5: Deploy

Click **Create Web Service**

Wait 3-5 minutes for deployment...

---

## Phase 6: Verify Deployment

### Check Logs
In Render Dashboard > Your Service > **Logs**

Look for:
```
✅ Database connection established
✅ Schema applied successfully
✅ Database connected and schema ready
Abhinayam Silks running at http://localhost:3000
Admin: /admin, Staff: /staff
```

### Test URLs

1. **Home Page**: `https://abhinayam-silks-xxx.onrender.com/`
   - Should load homepage

2. **Shop Page**: `https://abhinayam-silks-xxx.onrender.com/shop`
   - Should show products (or empty if no products added)

3. **Admin Login**: `https://abhinayam-silks-xxx.onrender.com/admin`
   - Username: `admin`
   - Password: [Your ADMIN_PASSWORD]

4. **Test Image Upload**: Add a product with image in admin
   - Should upload to S3 and display image

### Health Check

- Render auto-checks `/` endpoint
- If service shows "Live", deployment successful ✅

---

## Phase 7: Troubleshooting

### Error: "DATABASE_URL not set"
```
FIX: In Render Dashboard > Environment
    Add DATABASE_URL as secret/env var
```

### Error: "Cannot connect to database"
```
FIX 1: Verify DATABASE_URL syntax:
       postgresql://user:pass@host/dbname?sslmode=require

FIX 2: Check Neon database is running
       Test from terminal: psql $DATABASE_URL

FIX 3: Ensure Neon allows Render IP range
       Check Neon security settings
```

### Error: "Session secret invalid"
```
FIX: Generate new SESSION_SECRET:
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     Update in Render Dashboard
```

### Error: "Cannot upload images to S3"
```
Check in Logs:
- AWS credentials correct?
- Bucket name correct?
- Endpoint URL correct?
- Credentials have permissions?
```

### Error: "Service crashes on start"
```
FIX 1: Check all required env vars are set
FIX 2: Check logs for specific error message
FIX 3: Ensure DATABASE_URL is correct
FIX 4: Try restarting service:
       Render Dashboard > Service > Restart
```

---

## Phase 8: Post-Deployment

### Required Setup

1. **Update Admin Password**
   - Login to `/admin` with temporary password
   - Go to Settings > Change Password

2. **Add Shop Information**
   - Settings > Store Details
   - Update WhatsApp, UPI, Instagram

3. **Add Products**
   - Admin > Add Category
   - Admin > Add Products
   - Upload images (tests S3)

4. **Test Full Flow**
   - Browse products on `/shop`
   - Add to cart
   - Proceed to checkout
   - Click "Place order on WhatsApp"

### Optional Customizations

1. **Custom Domain**
   - Render Dashboard > Service > Settings
   - Add custom domain
   - Update `PUBLIC_BASE_URL` if needed

2. **Auto-Deploy Updates**
   - Already enabled in `render.yaml` (`autoDeploy: true`)
   - Push to `main` → automatic deployment

3. **Monitor Performance**
   - Render Dashboard > Metrics
   - Watch CPU, memory, bandwidth

---

## Quick Commands Reference

```bash
# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test database connection locally
psql $DATABASE_URL

# View current env
env | grep -E "DATABASE_URL|SESSION_SECRET|AWS"

# Deploy logs (view in Render dashboard)
tail -f logs

# Restart service (manual)
# In Render Dashboard > Service > Restart
```

---

## Success Criteria ✓

Your deployment is successful when:

- [ ] Service shows "Live" status in Render Dashboard
- [ ] Logs show "Database connected and schema ready"
- [ ] Homepage loads: `/`
- [ ] Shop page loads: `/shop`
- [ ] Admin login works: `/admin`
- [ ] Can add product with image upload
- [ ] Images display from S3
- [ ] Cart functionality works
- [ ] WhatsApp integration works

---

## Next Steps After Deployment

1. **Monitor**: Watch Render Dashboard for any issues
2. **Test Thoroughly**: Try all features on production
3. **Backup**: Regular database backups (Neon handles this)
4. **Updates**: Keep dependencies updated
5. **Security**: Rotate secrets periodically

---

## Support & Documentation

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **Neon Docs**: https://neon.tech/docs
- **Express.js**: https://expressjs.com
- **PostgreSQL**: https://www.postgresql.org/docs

---

**Last Updated**: 2026-11-05

For questions, check `RENDER_DEPLOYMENT_GUIDE.md` for detailed information.
