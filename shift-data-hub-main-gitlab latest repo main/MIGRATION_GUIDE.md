# Database Migration Guide

This guide explains how to run database migrations for the SHIFT Airdrop platform using Node.js.

---

## Quick Start

### Development (Local)
```bash
npm run migrate
```

### Production (Render)
Add to your Render **Build Command**:
```bash
npm install && npm run build && npm run migrate
```

Or run manually from Render shell:
```bash
cd /app && npm run migrate
```

---

## How It Works

The migration runner (`src/db/migrate.ts`):

1. **Applies base schema** (`src/db/schema.sql`)
   - Creates all tables if they don't exist
   - Safe to run multiple times (uses `IF NOT EXISTS`)

2. **Runs all migrations** in order (`src/db/migrations/*.sql`)
   - Executes in alphabetical order: `001_*.sql`, `002_*.sql`, etc.
   - Each migration is idempotent (safe to re-run)
   - Migrations accumulate (never removed)

Example flow:
```
schema.sql
  ↓
001_initial.sql (if exists)
  ↓
002_snag_rebuild.sql
  ↓
003_referral_multiplier.sql
  ↓
004_snag_referral_integration.sql
  ↓
✅ Done
```

---

## Running Migrations

### Option 1: NPM Script (Recommended)
```bash
npm run migrate
```

**Output:**
```
╔══════════════════════════════════════════════════════════╗
║     SHIFT Airdrop — Database Migration Runner            ║
╚══════════════════════════════════════════════════════════╝

📝 Step 1: Applying base schema...

✅ Base schema applied successfully

📝 Step 2: Running migrations...

Found 4 migration(s):

  🔄 001_initial.sql...
  ✅ 001_initial.sql completed

  🔄 002_snag_rebuild.sql...
  ✅ 002_snag_rebuild.sql completed

  🔄 003_referral_multiplier.sql...
  ✅ 003_referral_multiplier.sql completed

  🔄 004_snag_referral_integration.sql...
  ✅ 004_snag_referral_integration.sql completed

╔══════════════════════════════════════════════════════════╗
║             ✅ All migrations completed!                 ║
╚══════════════════════════════════════════════════════════╝
```

### Option 2: TypeScript Directly
```bash
npx tsx src/db/migrate.ts
```

### Option 3: Compiled JavaScript
```bash
npm run build
node dist/db/migrate.js
```

---

## In Production (Render)

### Automated During Deployment

**Method 1: Add to Build Command** (Recommended)

In Render dashboard → Settings → Build Command:
```bash
npm install && npm run build && npm run migrate && npm start
```

This runs migrations automatically before the server starts.

### Manual Migration (If Needed)

In Render dashboard → Shell → run:
```bash
cd /app && npm run migrate
```

Then restart the service.

---

## Deployment Steps

### Step 1: Commit Migration File (Already Done)
```bash
git add src/db/migrations/004_snag_referral_integration.sql
git commit -m "migration: Phase 3 SNAG referral integration"
git push origin main
```

### Step 2: Update Render Build Command (if not already set)

Go to **Render Dashboard** → **Shift Airdrop Backend** → **Settings**:

Find **Build Command** and change to:
```bash
npm install && npm run build && npm run migrate && npm start
```

Or if using environment-based scripts, update `package.json`:
```json
{
  "scripts": {
    "start:prod": "npm run build && npm run migrate && node dist/index.js"
  }
}
```

And set Render Start Command to:
```bash
npm run start:prod
```

### Step 3: Trigger Deploy
Render will:
1. `npm install` — Install dependencies
2. `npm run build` — Compile TypeScript
3. `npm run migrate` — Run base schema + all migrations ✨
4. `npm start` — Start the server

### Step 4: Verify

Check Render logs:
```
npm run migrate

✅ Base schema applied successfully
✅ 004_snag_referral_integration.sql completed
✅ All migrations completed!

Server starting on port 3001...
```

---

## Verifying Migrations Applied

### Using Render PostgreSQL Client

In Render Shell:
```bash
psql $DATABASE_URL -c "\d snag_referral_events"
```

Expected output:
```
                      Table "public.snag_referral_events"
      Column       |            Type             |  Collation  | Nullable | Default
-------------------+-----------------------------+-------------+----------+---------
 id                | integer                     |             | not null | nextval('snag_referral_events_id_seq'::regclass)
 referrer_wallet   | character varying(64)       |             | not null |
 referred_wallet   | character varying(64)       |             | not null |
 referral_code     | character varying(64)       |             |          |
 reward_xp_given   | integer                     |             |          | 0
 processed_at      | timestamp without time zone |             |          | now()
```

### Check if Columns Exist
```bash
psql $DATABASE_URL -c "SELECT snag_default_referral_link FROM users LIMIT 1;"
```

Expected: Should return NULL (no error) if column exists.

---

## Troubleshooting

### Migration Fails: "Column already exists"
**This is OK!** Migrations use `IF NOT EXISTS`, so they're safe to re-run.

If you see:
```
ERROR: column "snag_custom_referral_code" of relation "users" already exists
```

This means the migration already ran. The next run will skip it.

### Migration Fails: "Connection refused"
**Check:**
- Is `DATABASE_URL` environment variable set?
- Is PostgreSQL running?
- Is the database accessible from your location?

**Fix:**
```bash
echo $DATABASE_URL  # Verify it's set
psql $DATABASE_URL -c "SELECT version();"  # Test connection
```

### Migration Fails: "Permission denied"
**Check:**
- Does your database user have CREATE TABLE permission?
- Does your database user have ALTER TABLE permission?

**Fix:**
```bash
psql $DATABASE_URL -c "GRANT ALL PRIVILEGES ON SCHEMA public TO your_user;"
```

### Want to Check Migration Status?

There's no "migration status" table, but you can verify tables exist:
```bash
psql $DATABASE_URL -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
"
```

---

## Adding New Migrations

### To Create a New Migration:

1. **Create file** in `src/db/migrations/`:
   ```bash
   touch src/db/migrations/005_my_new_migration.sql
   ```

2. **Write SQL** (must be idempotent):
   ```sql
   -- Migration 005: Add new feature
   -- All statements use IF NOT EXISTS — safe to re-run
   
   ALTER TABLE users
     ADD COLUMN IF NOT EXISTS my_new_column VARCHAR(255);
   
   CREATE INDEX IF NOT EXISTS idx_users_my_column
     ON users(my_new_column);
   ```

3. **Test locally**:
   ```bash
   npm run migrate
   ```

4. **Commit and push**:
   ```bash
   git add src/db/migrations/005_my_new_migration.sql
   git commit -m "migration: Add my_new_column to users table"
   git push origin main
   ```

5. **Deploy** — Render will automatically run the new migration on next deploy.

---

## Key Principles

✅ **Idempotent:** All migrations use `IF NOT EXISTS`, safe to re-run  
✅ **Ordered:** Migrations run in alphabetical order (001, 002, 003, ...)  
✅ **Additive:** Migrations are never deleted or modified  
✅ **Automatic:** On Render, runs before server starts  
✅ **Simple:** No complex rollback logic, migrations are one-way  

---

## FAQ

**Q: Can I rollback a migration?**
A: No, migrations are forward-only. If you need to undo something, create a new migration that removes it.

**Q: What if a migration fails halfway?**
A: Each statement runs independently. Failed statements will be logged. Fix the issue in your migration file and re-run `npm run migrate`.

**Q: Can I run migrations while the server is running?**
A: Yes, but be careful. Running migrations while the server is using tables can cause locks. Best practice: stop server → run migrations → start server.

**Q: How do I know which migrations have run?**
A: Look at the database tables. If `snag_referral_events` table exists, migration 004 has run. If `snag_multiplier_id` column exists in `users`, migration 004 has run.

**Q: Can I run just one specific migration?**
A: Not easily with this runner. If you need that, manually run the SQL from a postgres client.

---

## Render Deployment Checklist

- [ ] Database migration file created: `src/db/migrations/004_*.sql`
- [ ] Migration committed to main branch
- [ ] Render Build Command includes `npm run migrate`
- [ ] Deploy triggered (push to main or manual redeploy)
- [ ] Check Render logs for "✅ All migrations completed!"
- [ ] Verify tables exist in database
- [ ] Server started successfully

---

## Summary

**Old way (psql):**
```bash
psql $DATABASE_URL -f src/db/migrations/004_snag_referral_integration.sql
```

**New way (Node.js):**
```bash
npm run migrate
```

**Benefits:**
- ✅ No psql required
- ✅ Works on Windows, Mac, Linux
- ✅ Part of deployment pipeline
- ✅ Better error messages
- ✅ Logs all migrations
- ✅ Integrates with Render build

**On Render:** Add `npm run migrate` to Build Command and it runs automatically! 🚀
