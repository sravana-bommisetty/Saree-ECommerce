# PostgreSQL Migration Setup

## Status
✅ **Migration Complete!** Your data has been successfully migrated from SQLite to Neon PostgreSQL.

## What Was Done

1. **Created PostgreSQL Schema** - `db/schema-postgres.sql`
   - Converted all tables from SQLite to PostgreSQL syntax
   - Auto-incrementing IDs use SERIAL type
   - Boolean fields use native PostgreSQL BOOLEAN type
   - Timestamps use TIMESTAMP type

2. **Migrated Data** - Successfully transferred:
   - ✓ 5 Categories
   - ✓ 6 Products
   - ✓ 6 Product Images
   - ✓ Admin users, orders, and settings

3. **Added PostgreSQL Support** - Updated application code:
   - `src/db.js` - Now supports both SQLite and PostgreSQL
   - `src/config.js` - Reads `DATABASE_URL` environment variable
   - `package.json` - Added `pg` driver dependency

## Production Deployment

### Option 1: Neon PostgreSQL (Recommended)

**Already configured!** Your Neon database is ready to use.

#### Setup:
```bash
# In your deployment environment, set:
export DATABASE_URL="postgresql://neondb_owner:npg_Deupf87RSaFA@ep-falling-glade-beib509k-pooler.c-9.us-east-2.aws.neon.tech/abhinayam?sslmode=require&channel_binding=require"

# Then run:
npm start
```

#### For Vercel/Railway/Render:
- Add `DATABASE_URL` as an environment variable
- Ensure `pg` is in `package.json` dependencies (already done ✓)
- Application will automatically use PostgreSQL

#### For Docker:
- Update `Dockerfile` to install pg if needed
- Pass `DATABASE_URL` environment variable

### Option 2: Local Development (SQLite)

You can still use SQLite locally for development:

```bash
# Remove DATABASE_URL if set
unset DATABASE_URL

# Run normally - it will use local SQLite
npm start
```

## Deployment Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Environment Variable
```bash
# For Neon PostgreSQL
export DATABASE_URL="postgresql://neondb_owner:npg_Deupf87RSaFA@ep-falling-glade-beib509k-pooler.c-9.us-east-2.aws.neon.tech/abhinayam?sslmode=require&channel_binding=require"
```

### Step 3: Start Application
```bash
npm start
```

## Important Notes

⚠️ **DATABASE_URL vs Local SQLite**
- If `DATABASE_URL` is set → Uses PostgreSQL (production mode)
- If `DATABASE_URL` is not set → Uses local SQLite (development mode)

🔒 **Security**
- **NEVER** commit your DATABASE_URL to Git
- Always use environment variables
- Add `.env` to `.gitignore` (already done)

📝 **Future Database Migrations**
- The schema is now in PostgreSQL
- For schema changes, modify `db/schema-postgres.sql`
- Run migrations against Neon directly or via your app

## Troubleshooting

### "no such table" errors
- Ensure DATABASE_URL is set correctly
- Verify connection to Neon: `psql postgresql://...`

### Connection timeout
- Check your Neon account status
- Verify network/firewall allows outbound connections
- Test with: `psql -d postgresql://...`

### "pg" module not found
- Run: `npm install`
- Ensure `pg` is in `package.json`

## Rollback to SQLite

If you need to rollback temporarily:

```bash
# Unset DATABASE_URL
unset DATABASE_URL

# Application will use local SQLite
npm start
```

**Note:** Any changes made in PostgreSQL won't be reflected in SQLite after rollback.

## Next Steps

1. ✅ Migration complete
2. ✅ PostgreSQL schema created
3. ✅ Data migrated
4. ✅ App code updated
5. 🔄 Deploy with `DATABASE_URL` set
6. 🔄 Test all features in production
