# 🔐 Environment Variables Reference

## Complete Environment Variables Map

This is your complete reference for all environment variables needed for Render deployment.

---

## Required Variables (Must Have)

### DATABASE_URL ⚠️ CRITICAL

```yaml
Key: DATABASE_URL
Type: Secret
Required: Yes
Scope: Runtime
Source: Neon PostgreSQL dashboard
Example: postgresql://user:pass@ep-xyz.neon.tech/abhinayam?sslmode=require
```

**What it does:**
- Connects your app to PostgreSQL database
- Uses SSL encryption for security
- Includes database name and authentication

**How to get it:**
1. Go to https://console.neon.tech
2. Select your project
3. Copy "Connection string" (Pooled connection recommended)
4. Should include `?sslmode=require&channel_binding=require`

**In render.yaml:**
```yaml
- key: DATABASE_URL
  scope: build,runtime
  value: # Set in Render dashboard secrets
```

**In Render Dashboard:**
- Environment → + Add Secret
- Key: `DATABASE_URL`
- Value: [Your connection string]

---

### SESSION_SECRET ⚠️ IMPORTANT

```yaml
Key: SESSION_SECRET
Type: Secret
Required: Yes (in production)
Scope: Runtime
Source: Generate with Node.js
```

**What it does:**
- Encrypts Express session cookies
- Keeps user login secure
- Must be random and unique

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output example:**
```
9f7d8c3e2a1b4f5e6d7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c
```

**Never use:**
- Same value in dev and prod
- Weak passwords or predictable strings
- "change-me" or similar

**In Render Dashboard:**
- Environment → + Add Secret
- Key: `SESSION_SECRET`
- Value: [Your generated 64-char string]

---

### NODE_ENV

```yaml
Key: NODE_ENV
Type: Environment Variable
Required: Yes
Scope: Build, Runtime
Value: production
```

**What it does:**
- Tells Express to run in production mode
- Disables dev tools and debug logging
- Enables performance optimizations

**In render.yaml:**
```yaml
- key: NODE_ENV
  value: production
```

---

### PORT

```yaml
Key: PORT
Type: Environment Variable
Required: No (default: 3000)
Scope: Runtime
Value: 3000
```

**What it does:**
- Express server listens on this port
- Render routes traffic to this port

**In render.yaml:**
```yaml
- key: PORT
  value: 3000
```

---

## S3 Storage Variables

### AWS_BUCKET_NAME

```yaml
Key: AWS_BUCKET_NAME
Type: Environment Variable
Required: Only if using S3
Scope: Runtime
Value: [Your bucket name]
```

**What it does:**
- Specifies which S3 bucket to upload to
- Can be Neon or AWS S3

**Example values:**
- Neon: `abhinayam-silks` or `abhinayam-images`
- AWS: `your-bucket-name`

**How to find:**
- Neon: Check your object storage settings
- AWS: S3 Dashboard → Buckets

**In render.yaml:**
```yaml
- key: AWS_BUCKET_NAME
  value: # Your bucket name
```

---

### AWS_ENDPOINT_URL_S3

```yaml
Key: AWS_ENDPOINT_URL_S3
Type: Environment Variable
Required: Only if using Neon S3
Scope: Runtime
Value: [Neon S3 endpoint]
```

**What it does:**
- Points to S3 server location
- Different for Neon vs AWS

**Example values:**
- Neon: `https://br-sweet-recipe-xyz.storage.c-9.us-east-2.aws.neon.tech`
- AWS Standard: Omit (uses AWS default)

**How to find:**
1. Neon: Settings → Object Storage → Endpoint
2. AWS: Not needed (uses default aws.amazon.com)

**⚠️ Important for Neon:**
- Must use `forcePathStyle: true` in S3 client
- Already configured in your code ✅

**In render.yaml:**
```yaml
- key: AWS_ENDPOINT_URL_S3
  value: # Your Neon S3 endpoint
```

---

### AWS_REGION

```yaml
Key: AWS_REGION
Type: Environment Variable
Required: No (default: us-east-2)
Scope: Runtime
Value: us-east-2
```

**What it does:**
- Specifies geographic region for S3
- Affects latency and data residency

**Common values:**
- `us-east-2` (Ohio) - Default for Neon
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)

**In render.yaml:**
```yaml
- key: AWS_REGION
  value: us-east-2
```

---

### AWS_ACCESS_KEY_ID ⚠️ SECRET

```yaml
Key: AWS_ACCESS_KEY_ID
Type: Secret
Required: Only if using S3
Scope: Runtime
Source: Neon or AWS console
```

**What it does:**
- Authenticates requests to S3
- Like a username for S3

**Format:**
- Neon: `nak_live_xxxxx...` (starts with nak_live_)
- AWS: `AKIAIOSFODNN7EXAMPLE`

**How to get it:**
1. Neon: Dashboard → Object Storage → Credentials
2. AWS: IAM → Users → Security credentials

**In Render Dashboard:**
- Environment → + Add Secret
- Key: `AWS_ACCESS_KEY_ID`
- Value: [From Neon/AWS console]

**⚠️ NEVER:**
- Commit to GitHub
- Share publicly
- Use in code directly

---

### AWS_SECRET_ACCESS_KEY ⚠️ SECRET

```yaml
Key: AWS_SECRET_ACCESS_KEY
Type: Secret
Required: Only if using S3
Scope: Runtime
Source: Neon or AWS console
```

**What it does:**
- Authenticates requests to S3
- Like a password for S3
- Can't be recovered if lost

**Format:**
- Neon: `nsk_live_xxxxx...` (starts with nsk_live_)
- AWS: Long alphanumeric string

**How to get it:**
1. Neon: Dashboard → Object Storage → Credentials
2. AWS: IAM → Users → Security credentials

**In Render Dashboard:**
- Environment → + Add Secret
- Key: `AWS_SECRET_ACCESS_KEY`
- Value: [From Neon/AWS console]

**⚠️ NEVER:**
- Commit to GitHub
- Share in chat or email
- Use in code directly
- Rotate every 90 days (best practice)

---

## Shop Configuration Variables

### WHATSAPP_NUMBER

```yaml
Key: WHATSAPP_NUMBER
Type: Environment Variable
Required: No (editable in admin)
Default: 919999999999
Scope: Runtime
Format: Country code + number (no symbols)
```

**Example:**
- India: `919876543210` (91 = India, 9876543210 = number)
- Global: `1234567890` + country code prefix

**In render.yaml:**
```yaml
- key: WHATSAPP_NUMBER
  value: 919999999999
```

**Can be changed later:**
- Admin → Settings → WhatsApp Number

---

### UPI_ID

```yaml
Key: UPI_ID
Type: Environment Variable
Required: No (editable in admin)
Default: abhinayamsilks@upi
Scope: Runtime
Format: username@bankcode
```

**Common bank codes:**
- `@upi` - Generic/NPCI
- `@okaxis` - Axis Bank
- `@okicici` - ICICI Bank
- `@okhdfcbank` - HDFC Bank
- `@okidbi` - IDBI Bank

**Example:**
- `abhinayamsilks@upi`
- `abhinayam@okhdfcbank`

**In render.yaml:**
```yaml
- key: UPI_ID
  value: abhinayamsilks@upi
```

**Can be changed later:**
- Admin → Settings → UPI ID

---

### UPI_PAYEE_NAME

```yaml
Key: UPI_PAYEE_NAME
Type: Environment Variable
Required: No (editable in admin)
Default: Abhinayam Silks
Scope: Runtime
Format: Business/Owner name
```

**Shows in UPI payment screen as:**
```
Pay ₹5000 to Abhinayam Silks
```

**In render.yaml:**
```yaml
- key: UPI_PAYEE_NAME
  value: Abhinayam Silks
```

**Can be changed later:**
- Admin → Settings → Store Name

---

### INSTAGRAM_URL

```yaml
Key: INSTAGRAM_URL
Type: Environment Variable
Required: No (editable in admin)
Default: https://www.instagram.com/abhinayamsilks
Scope: Runtime
Format: Full Instagram profile URL
```

**Example:**
```
https://www.instagram.com/abhinayamsilks
https://www.instagram.com/yourshopname
```

**In render.yaml:**
```yaml
- key: INSTAGRAM_URL
  value: https://www.instagram.com/abhinayamsilks
```

**Can be changed later:**
- Admin → Settings → Social Links

---

## Admin Account Variables

### ADMIN_USERNAME

```yaml
Key: ADMIN_USERNAME
Type: Environment Variable
Required: No (default: admin)
Scope: Runtime
Default: admin
```

**What it does:**
- Username for admin login
- Automatically created on first start if admin doesn't exist

**Can be changed later:**
- Admin → Settings → Change Admin Username

**In render.yaml:**
```yaml
- key: ADMIN_USERNAME
  value: admin
```

---

### ADMIN_PASSWORD ⚠️ IMPORTANT

```yaml
Key: ADMIN_PASSWORD
Type: Secret
Required: Yes (for first login)
Scope: Runtime
Format: Strong password (12+ chars recommended)
```

**Requirements:**
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers recommended
- No spaces

**Example strong passwords:**
- `MyAdmin@2024!`
- `SecurePass123$`
- `AdminP@ss2024`

**How to set:**
1. In Render Dashboard → + Add Secret
2. Key: `ADMIN_PASSWORD`
3. Value: [Your strong password]

**After deployment:**
- Change password immediately
- Go to Admin → Settings → Change Password

**If forgotten:**
- Set new one in Render Dashboard
- Restart service

**In render.yaml:**
```yaml
- key: ADMIN_PASSWORD
  scope: runtime
  value: # Set in Render dashboard secrets
```

---

## Other Variables

### PUBLIC_BASE_URL (Optional)

```yaml
Key: PUBLIC_BASE_URL
Type: Environment Variable
Required: No (uses RENDER_EXTERNAL_URL)
Scope: Runtime
```

**What it does:**
- Public URL of your app
- Used for email links, APIs, redirects

**Example values:**
- Render: `https://abhinayam-silks-xxx.onrender.com`
- Custom domain: `https://www.abhinayamsilks.com`

**How Render handles this:**
1. If you set `PUBLIC_BASE_URL` → uses that
2. If not set → automatically uses `RENDER_EXTERNAL_URL`
3. Fallback → `http://localhost:3000`

**You only need to set if:**
- Using custom domain
- Need specific URL behavior

**In render.yaml:**
```yaml
- key: PUBLIC_BASE_URL
  scope: runtime
  value: # Will auto-use RENDER_EXTERNAL_URL if not set
```

---

### UPLOAD_DIR (Optional)

```yaml
Key: UPLOAD_DIR
Type: Environment Variable
Required: No (default: uploads)
Scope: Runtime
Value: uploads
```

**What it does:**
- Local directory for temporary uploads
- Not used since images go to S3

**Note:**
- Render filesystem is ephemeral (deleted on restart)
- Use only for temporary storage
- Production should use S3 only

**In render.yaml:**
```yaml
- key: UPLOAD_DIR
  value: uploads
```

---

## Quick Copy-Paste for Render Dashboard

### All Environment Variables (Non-Secret)

```
NODE_ENV=production
PORT=3000
UPLOAD_DIR=uploads
WHATSAPP_NUMBER=919999999999
UPI_ID=abhinayamsilks@upi
UPI_PAYEE_NAME=Abhinayam Silks
INSTAGRAM_URL=https://www.instagram.com/abhinayamsilks
AWS_REGION=us-east-2
ADMIN_USERNAME=admin
AWS_BUCKET_NAME=your-bucket-name
AWS_ENDPOINT_URL_S3=your-endpoint-url
```

### All Secrets (Use "+ Add Secret" for each)

```
DATABASE_URL = [your-postgresql-url]
SESSION_SECRET = [generated-32-char-hex]
ADMIN_PASSWORD = [your-strong-password]
AWS_ACCESS_KEY_ID = [from-neon-or-aws]
AWS_SECRET_ACCESS_KEY = [from-neon-or-aws]
```

---

## Checklist: Before Deploying

- [ ] `DATABASE_URL` - PostgreSQL connection string ready
- [ ] `SESSION_SECRET` - Generated 64-character hex string
- [ ] `ADMIN_PASSWORD` - Strong password chosen
- [ ] `AWS_ACCESS_KEY_ID` - S3 access key copied
- [ ] `AWS_SECRET_ACCESS_KEY` - S3 secret key copied
- [ ] `AWS_BUCKET_NAME` - Bucket name confirmed
- [ ] `AWS_ENDPOINT_URL_S3` - Endpoint URL copied
- [ ] All other values reviewed and approved
- [ ] No secrets in `render.yaml` (only marked as "Set in Render dashboard")
- [ ] Ready to paste into Render Dashboard

---

## Reference Table

| Variable | Required | Secret | Default | Use Case |
|----------|----------|--------|---------|----------|
| DATABASE_URL | ✅ Yes | ✅ Yes | — | PostgreSQL connection |
| SESSION_SECRET | ✅ Yes | ✅ Yes | — | Session encryption |
| NODE_ENV | ✅ Yes | ❌ No | development | Environment mode |
| PORT | ❌ No | ❌ No | 3000 | Server port |
| PUBLIC_BASE_URL | ❌ No | ❌ No | RENDER_EXTERNAL_URL | App public URL |
| AWS_BUCKET_NAME | ❌ No | ❌ No | — | S3 bucket |
| AWS_ENDPOINT_URL_S3 | ❌ No | ❌ No | — | S3 endpoint (Neon) |
| AWS_REGION | ❌ No | ❌ No | us-east-2 | AWS region |
| AWS_ACCESS_KEY_ID | ❌ No | ✅ Yes | — | S3 auth |
| AWS_SECRET_ACCESS_KEY | ❌ No | ✅ Yes | — | S3 auth |
| ADMIN_USERNAME | ❌ No | ❌ No | admin | Admin login |
| ADMIN_PASSWORD | ❌ No | ✅ Yes | — | Admin login |
| WHATSAPP_NUMBER | ❌ No | ❌ No | 919999999999 | Shop contact |
| UPI_ID | ❌ No | ❌ No | abhinayamsilks@upi | Payment |
| UPI_PAYEE_NAME | ❌ No | ❌ No | Abhinayam Silks | Payment display |
| INSTAGRAM_URL | ❌ No | ❌ No | Instagram URL | Social link |
| UPLOAD_DIR | ❌ No | ❌ No | uploads | Temp uploads |

---

**Status**: All environment variables documented and ready for deployment ✅

For detailed deployment instructions, see `RENDER_DEPLOYMENT_GUIDE.md`
