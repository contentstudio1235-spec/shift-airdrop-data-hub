# 🚂 Railway Deployment Checklist

**Service**: shift-airdrop-backend-production.up.railway.app

## Step 1: Set Environment Variables in Railway Dashboard

Go to Railway Dashboard → Your Project → Variables → Set all of the following:

### Database
```
DATABASE_URL = postgresql://[user]:[password]@[host]:[port]/[dbname]
```
*(Railway auto-creates a PostgreSQL plugin — copy the connection string from the PostgreSQL plugin settings)*

### Server
```
PORT = 3001
NODE_ENV = production
```

### Helius (Solana RPC & Webhooks)
```
HELIUS_API_KEY = [your-helius-api-key]
HELIUS_WEBHOOK_SECRET = [your-webhook-secret]
```

### Jupiter Price API
```
JUPITER_PRICE_API = https://api.jup.ag/price/v2
```

### SNAG (Loyalty Platform)
```
SNAG_API_KEY = [your-snag-api-key]
SNAG_ORGANIZATION_ID = [your-org-id]
SNAG_WEBSITE_ID = [your-website-id]
SNAG_BASE_URL = https://admin.snagsolutions.io

SNAG_XP_RULE_ID = [xp-rule-id]
SNAG_FIRST_TRADE_BADGE_ID = [first-trade-id]
SNAG_DIAMOND_HANDS_BADGE_ID = [diamond-hands-id]
SNAG_EARNINGS_REACTOR_BADGE_ID = [earnings-reactor-id]
SNAG_FOMC_TRADER_BADGE_ID = [fomc-trader-id]
SNAG_SHIFT_HOLDER_BADGE_ID = [shift-holder-id]
```

### Anti-Farm Configuration
```
MIN_POSITION_SIZE_USD = 10
MIN_HOLD_HOURS = 24
WASH_TRADE_WINDOW_MINUTES = 5
COOLDOWN_MINUTES = 60
```

## Step 2: Deploy on Railway

1. **Link GitHub Repo**:
   - Railway → Project → GitHub Integration
   - Link: `https://github.com/contentstudio1235-spec/Shift_airdrop-backend`

2. **Configure Deployment**:
   - Railway auto-detects `railway.json` (already configured with NIXPACKS)
   - Start Command: `npm start`
   - Health Check Path: `/health`

3. **Deploy**:
   - Push a commit to `main` OR manually trigger deploy in Railway dashboard
   - Watch logs: Railway Dashboard → Logs tab

## Step 3: Run Database Migrations

Once deployed and running:

```bash
# SSH into Railway container (or run via Railway dashboard CLI)
npm run migrate
```

Or if Railway doesn't allow direct SSH, add a pre-start hook in `package.json`:
```json
"prestart": "npm run migrate"
```

## Step 4: Verify Deployment

✅ Check health endpoint:
```bash
curl https://shift-airdrop-backend-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "shift-airdrop-backend",
  "version": "1.0.0",
  "env": "production",
  "uptime": 123
}
```

✅ Check root endpoint:
```bash
curl https://shift-airdrop-backend-production.up.railway.app/
```

## Step 5: Update Helius Webhook

Once Railway is running:

1. Go to **Helius Dashboard** → Webhooks
2. Update webhook URL to: `https://shift-airdrop-backend-production.up.railway.app/api/webhooks/helius`
3. Verify webhook is active and receiving events

---

**Timeline**: ~10-15 minutes for full deployment + migrations
