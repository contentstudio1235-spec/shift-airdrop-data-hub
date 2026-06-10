# MERGE PLAN: Current Work + GitLab Latest

## WHAT'S DIFFERENT

### 1. Routes (MISSING in Current - Need to ADD from GitLab)
- ❌ Missing: `/api/users` route
- ❌ Missing: `/api/track` route
- ✅ All other routes present

### 2. Migrations (RESOLVED - No Conflicts)
**Current (our work):**
- 018_add_launch_multiplier_snapshot.sql ✅ (Bug fix)
- 019_pnl_fields.sql ✅ (P&L feature)

**GitLab:**
- 017_universal_identity.sql (Identity feature)

### 3. Backend Services (Similar but different versions)
- src/index.ts - Minor differences
- src/services/heliusWebhookHandler.ts - Different implementations
- src/services/xpEngine.ts - Both have updates
- src/db/pool.ts - Configuration differences

### 4. Frontend (Differences in API calls)
- frontend/lib/api.ts - Different endpoint definitions

## MERGE STRATEGY

### Step 1: Copy Missing Route Files from GitLab
- [ ] Copy routes/users.ts
- [ ] Copy routes/track.ts

### Step 2: Update src/index.ts
- [ ] Add imports for usersRoutes and trackRoutes
- [ ] Add app.use() registrations for new routes
- [ ] Keep all our middleware and CORS config

### Step 3: Validate Services
- [ ] Keep current xpEngine.ts (has our bug fixes)
- [ ] Keep current heliusWebhookHandler.ts (enhanced)
- [ ] Merge pool.ts config carefully

### Step 4: Database
- [ ] Keep all migrations (no conflicts after renaming)
- [ ] Migrations run in order: 002-019

### Step 5: Build & Test
- [ ] npm run build (verify no TypeScript errors)
- [ ] Check migrations can run
- [ ] Verify all routes load

## RISK ASSESSMENT

| Component | Risk | Mitigation |
|-----------|------|-----------|
| New routes (users, track) | LOW | Just adding new endpoints |
| Migrations | NONE | Renamed ours to 018-019 |
| Backend services | MEDIUM | Keep current versions (tested) |
| Frontend API | MEDIUM | Update endpoints if needed |

## FILES TO MERGE

### Must Copy from GitLab
- src/routes/users.ts
- src/routes/track.ts

### Must Update in Current
- src/index.ts (add route imports & registrations)

### Keep Current (Already Verified)
- src/services/xpEngine.ts
- src/services/heliusWebhookHandler.ts
- src/services/pnlService.ts
- All migrations (002-019)
