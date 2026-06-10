# 🚀 Vercel Frontend Deployment Checklist

**Service**: airdrop.shift.xyz

## Step 1: Prepare Frontend for Deployment

### Verify Build
```bash
cd frontend
npm run build
# Should succeed with no errors
```

### Environment Variable
Create `.env.production.local` in `/frontend`:
```
NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app
```

This tells the frontend where to call the backend API.

## Step 2: Push to GitHub

```bash
# From root of repo
git add frontend/
git commit -m "add: frontend dashboard for airdrop"
git push origin main
```

Frontend code should now be in the main GitHub repo.

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI (Fastest)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Follow prompts:
- **Project**: Create new project (if first time)
- **Framework**: Select "Next.js"
- **Root directory**: `frontend`
- **Build command**: `npm run build`
- **Output directory**: `.next`

### Option B: Via Vercel Dashboard (Web UI)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import GitHub repository (`contentstudio1235-spec/Shift_airdrop-backend`)
4. **Root Directory**: Set to `frontend`
5. **Environment Variables**: Add `NEXT_PUBLIC_API_URL=https://shift-airdrop-backend-production.up.railway.app`
6. Click "Deploy"

## Step 4: Configure Custom Domain

1. Vercel Dashboard → Project Settings → Domains
2. Add domain: `airdrop.shift.xyz`
3. Update DNS records at your domain registrar:
   - CNAME: `airdrop.shift.xyz` → `cname.vercel.com`
   - (Or use Vercel nameservers)
4. Wait ~5-10 minutes for DNS propagation

## Step 5: Verify Deployment

✅ Check homepage:
```bash
curl https://airdrop.shift.xyz
```

✅ Check dashboard loads and connects to backend:
- Visit https://airdrop.shift.xyz/dashboard
- Enter a test wallet address
- Should show "Backend: ✅ Connected"

✅ Check leaderboard:
- Visit https://airdrop.shift.xyz/leaderboard
- Should display top traders from backend

## Step 6: Enable CORS in Backend (if needed)

If frontend gets CORS errors, verify backend CORS config in `src/index.ts` includes:
```typescript
origin: [
  'http://localhost:3000',
  'https://airdrop.shift.xyz',
  'https://www.shiftrwa.xyz',
  'https://shiftrwa.xyz',
],
```

If not, add `https://airdrop.shift.xyz` and redeploy backend.

---

**Timeline**: ~5-10 minutes (depends on DNS propagation)
