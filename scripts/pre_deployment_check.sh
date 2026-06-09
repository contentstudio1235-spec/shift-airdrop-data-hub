#!/bin/bash

# Pre-Deployment Verification Script
# Run this before deploying to production
# Usage: bash scripts/pre_deployment_check.sh

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  SHIFT RWA Referral System - Pre-Deployment Verification"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print check result
check_result() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((CHECKS_FAILED++))
  fi
}

# ════════════════════════════════════════════════════════════════
# 1. Backend Compilation
# ════════════════════════════════════════════════════════════════
echo ""
echo "1️⃣  BACKEND BUILD CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check TypeScript compilation
if npm run build > /dev/null 2>&1; then
  check_result "TypeScript compilation"
else
  check_result "TypeScript compilation" || true
fi

# Check for required services
test -f src/services/referralCommissionService.ts
check_result "ReferralCommissionService exists"

test -f src/services/userPointsService.ts
check_result "UserPointsService exists"

test -f src/services/leaderboardCacheService.ts
check_result "LeaderboardCacheService exists"

# Check for API routes
test -f src/routes/referralRoutes.ts
check_result "ReferralRoutes exists"

# Check for cron jobs
test -f src/cron/referralCronJobs.ts
check_result "ReferralCronJobs exists"

# ════════════════════════════════════════════════════════════════
# 2. Frontend Build Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "2️⃣  FRONTEND BUILD CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check frontend components
test -f frontend/app/referral/page.tsx
check_result "Referral page exists"

test -f frontend/app/referral/ReferralContent.tsx
check_result "ReferralContent component exists"

test -f frontend/components/ReferralHero.tsx
check_result "ReferralHero component exists"

test -f frontend/components/PendingBalanceCard.tsx
check_result "PendingBalanceCard component exists"

test -f frontend/components/ReferredUsersTable.tsx
check_result "ReferredUsersTable component exists"

test -f frontend/components/LeaderboardTabs.tsx
check_result "LeaderboardTabs component exists"

test -f frontend/components/LeaderboardRowChips.tsx
check_result "LeaderboardRowChips component exists"

# Check NavBar updated
grep -q "referral" frontend/components/NavBar.tsx
check_result "NavBar includes referral link"

# ════════════════════════════════════════════════════════════════
# 3. Database Migrations Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "3️⃣  DATABASE MIGRATIONS CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test -f src/db/migrations/022_referral_commission_engine.sql
check_result "Migration 022 exists"

test -f src/db/migrations/023_referral_indexes.sql
check_result "Migration 023 exists"

# Verify migration syntax (basic check)
grep -q "CREATE TABLE referral_commissions" src/db/migrations/022_referral_commission_engine.sql
check_result "Migration 022 has referral_commissions table"

grep -q "CREATE TABLE referral_monthly_caps" src/db/migrations/022_referral_commission_engine.sql
check_result "Migration 022 has referral_monthly_caps table"

grep -q "CREATE INDEX" src/db/migrations/023_referral_indexes.sql
check_result "Migration 023 has indexes"

# ════════════════════════════════════════════════════════════════
# 4. Backfill Script Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "4️⃣  BACKFILL SCRIPT CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test -f scripts/backfill_legacy_referrers.ts
check_result "Backfill script exists"

grep -q "dry-run" scripts/backfill_legacy_referrers.ts
check_result "Backfill script has dry-run mode"

grep -q "execute" scripts/backfill_legacy_referrers.ts
check_result "Backfill script has execute mode"

# ════════════════════════════════════════════════════════════════
# 5. Documentation Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "5️⃣  DOCUMENTATION CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test -f BUILD_LOG.md
check_result "BUILD_LOG.md exists"

test -f REFERRAL_DEPLOYMENT_GUIDE.md
check_result "Deployment guide exists"

test -f REFERRAL_IMPLEMENTATION_SUMMARY.md
check_result "Implementation summary exists"

# ════════════════════════════════════════════════════════════════
# 6. Environment Variables Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "6️⃣  ENVIRONMENT VARIABLES CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}⚠ DATABASE_URL not set${NC}"
  ((CHECKS_FAILED++))
else
  echo -e "${GREEN}✓ PASS${NC}: DATABASE_URL is set"
  ((CHECKS_PASSED++))
fi

if [ -z "$REDIS_URL" ]; then
  echo -e "${YELLOW}⚠ REDIS_URL not set${NC}"
  ((CHECKS_FAILED++))
else
  echo -e "${GREEN}✓ PASS${NC}: REDIS_URL is set"
  ((CHECKS_PASSED++))
fi

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo -e "${YELLOW}⚠ NEXT_PUBLIC_API_URL not set${NC}"
  ((CHECKS_FAILED++))
else
  echo -e "${GREEN}✓ PASS${NC}: NEXT_PUBLIC_API_URL is set"
  ((CHECKS_PASSED++))
fi

# ════════════════════════════════════════════════════════════════
# 7. Dependencies Check
# ════════════════════════════════════════════════════════════════
echo ""
echo "7️⃣  DEPENDENCIES CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ PASS${NC}: Node.js installed ($NODE_VERSION)"
  ((CHECKS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Node.js not installed"
  ((CHECKS_FAILED++))
fi

if command -v psql &> /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: PostgreSQL client installed"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ PostgreSQL client not in PATH${NC}"
  ((CHECKS_FAILED++))
fi

if command -v redis-cli &> /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}: Redis client installed"
  ((CHECKS_PASSED++))
else
  echo -e "${YELLOW}⚠ Redis client not in PATH${NC}"
  ((CHECKS_FAILED++))
fi

# ════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  VERIFICATION SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo -e "✓ Passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "✗ Failed: ${RED}${CHECKS_FAILED}${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🚀 ALL CHECKS PASSED - READY FOR DEPLOYMENT${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  SOME CHECKS FAILED - REVIEW ABOVE${NC}"
  exit 1
fi
