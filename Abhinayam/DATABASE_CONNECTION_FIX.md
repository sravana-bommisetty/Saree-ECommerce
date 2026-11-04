# Database Connection Fix - Neon PostgreSQL

## Issue
Database connection timing out after 15+ seconds. This is typically caused by:
- **Neon free-tier auto-pause**: Free tier databases pause after 15 minutes of inactivity
- Incorrect database credentials
- Network/firewall issues

## Solution

### Step 1: Resume Your Neon Database
1. Go to **https://console.neon.tech**
2. Log in with your Neon account
3. Select your project
4. Click on the database that is paused
5. Look for a **"Resume"** button and click it
6. Wait for the database to resume (usually takes 5-10 seconds)

### Step 2: Verify Connection
After resuming, try to start the server:
```bash
node --env-file-if-exists=.env src/server.js
```

### Step 3: Keep Database Active (Optional)
To prevent future pausing, you can:

**Option A: Upgrade to paid plan**
- Paid Neon accounts don't auto-pause

**Option B: Enable GitHub integration for CI/CD**
- This keeps the database active

**Option C: Use connection pooling**
- Already implemented in `.env` (using `pooler` endpoint)

## Database URL Details

Your `.env` has been updated with the correct connection string:
```
DATABASE_URL=postgresql://neondb_owner:npg_Deupf87RSaFA@ep-falling-glade-beib509k-pooler.c-9.us-east-2.aws.neon.tech/abhinayam?sslmode=require&channel_binding=require
```

**Key points:**
- ✅ No IP whitelisting needed - Neon is public cloud
- ✅ Authentication via username/password in URL
- ✅ Using connection pooler endpoint (recommended)
- ✅ SSL enabled for security

## If Still Not Working

1. **Check Neon console for errors**
   - Login to console.neon.tech
   - Check if database shows any error messages

2. **Test connection manually**
   ```bash
   psql "postgresql://neondb_owner:npg_Deupf87RSaFA@ep-falling-glade-beib509k-pooler.c-9.us-east-2.aws.neon.tech/abhinayam?sslmode=require"
   ```

3. **Check credentials**
   - Verify username: `neondb_owner`
   - Verify password: `npg_Deupf87RSaFA`
   - Both appear correct in the URL

4. **Reset connection**
   - In Neon console, there's usually a "Reset password" option
   - Generate a new connection string and update `.env`

## Next Steps
1. Resume your Neon database
2. Start the server again
3. Test the application at http://localhost:3000
