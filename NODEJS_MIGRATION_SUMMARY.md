# Node.js Database Migration Runner

✅ **Migration system replaced from psql to Node.js**

---

## Quick Start

### Run Migrations
```bash
npm run migrate
```

### On Render (Auto-Deploy)
Update Build Command in Render dashboard:
```bash
npm install && npm run build && npm run migrate
```

Then every deploy automatically runs migrations before starting the server! 🚀

---

## What Changed

| Method | Before | After |
|--------|--------|-------|
| **Tool** | psql (PostgreSQL CLI) | Node.js script |
| **Command** | `psql $DATABASE_URL -f 004_*.sql` | `npm run migrate` |
| **Requirements** | psql binary installed | npm installed |
| **Platform** | Linux only | All platforms ✅ |
| **Auto on Deploy** | Manual | Integrated ✅ |
| **Error Messages** | Database errors | Clear logging ✅ |
| **Idempotent** | Yes (IF NOT EXISTS) | Yes ✅ |

---

## How It Works

1. **Base Schema**
   - Runs `src/db/schema.sql` first
   - Creates all tables with `IF NOT EXISTS`

2. **Migrations** (in order)
   - Reads all `src/db/migrations/*.sql` files
   - Executes in alphabetical order: 001, 002, 003, 004
   - Each migration is idempotent (safe to re-run)

3. **Output**
   ```
   ✅ Base schema applied
   ✅ 001_initial.sql completed
   ✅ 002_snag_rebuild.sql completed
   ✅ 003_referral_multiplier.sql completed
   ✅ 004_snag_referral_integration.sql completed
   ✅ All migrations completed!
   ```

---

## Implementation Details

**New Files:**
- `src/db/migrationRunner.ts` — Migration utility functions
- `MIGRATION_GUIDE.md` — Complete documentation

**Updated Files:**
- `src/db/migrate.ts` — Enhanced runner with better logging
- `PHASE2_ACTION_CHECKLIST.md` — Uses npm run migrate
- `PHASE3_ACTION_CHECKLIST.md` — Uses npm run migrate

**No Changes Needed:**
- `.env` or environment variables
- Database schema or migrations SQL
- Application code

---

## Deployment Options

### Option 1: Automated (Recommended)
```bash
# In Render Build Command:
npm install && npm run build && npm run migrate
```
Migrations run automatically on every deploy! ✨

### Option 2: Manual on Render
From Render Shell:
```bash
cd /app && npm run migrate
```

### Option 3: Local Development
```bash
npm run migrate
```

---

## Verification

Check migrations ran:
```bash
# From Render Shell
psql $DATABASE_URL -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'snag_referral_events');"
```

Or check Render logs:
```
npm run migrate
✅ All migrations completed!
```

---

## Migration Commands in package.json

```json
{
  "scripts": {
    "migrate": "tsx src/db/migrate.ts"
  }
}
```

Run via:
- `npm run migrate` — Direct execution
- `npx tsx src/db/migrate.ts` — TypeScript directly
- `node dist/db/migrate.js` — Compiled JavaScript

---

## Benefits

✅ **Cross-Platform** — Works on Windows, Mac, Linux  
✅ **No External Tools** — Just Node.js, which you already have  
✅ **Better Logging** — Clear output for each migration  
✅ **Integrated** — Part of deployment pipeline  
✅ **Type-Safe** — Written in TypeScript  
✅ **Same Stack** — Uses same database pool as app  
✅ **Idempotent** — Safe to run multiple times  

---

## For Phase 2 & 3 Deployments

Instead of:
```bash
psql $DATABASE_URL -f src/db/migrations/002_snag_rebuild.sql
psql $DATABASE_URL -f src/db/migrations/004_snag_referral_integration.sql
```

Just do:
```bash
npm run migrate
```

Done! All migrations (001, 002, 003, 004) run automatically. 🚀

---

## Full Documentation

See `MIGRATION_GUIDE.md` for:
- Creating new migrations
- Troubleshooting
- On Render setup
- FAQ
- Verification steps

---

**Status:** ✅ Production ready. Replaces all psql commands.
