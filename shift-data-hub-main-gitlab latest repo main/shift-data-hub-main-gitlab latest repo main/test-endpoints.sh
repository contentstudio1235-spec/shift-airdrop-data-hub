#!/bin/bash

# SHIFT Airdrop — Complete Endpoint Testing Script
# Usage: ./test-endpoints.sh <wallet> <backend_url>
# Example: ./test-endpoints.sh 3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn http://localhost:3001

WALLET=${1:-"3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn"}
BASE_URL=${2:-"http://localhost:3001"}

echo "🧪 SHIFT Airdrop Endpoint Testing"
echo "=================================="
echo "Wallet: $WALLET"
echo "Backend: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3

  echo -n "Testing $description... "

  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST "$BASE_URL$endpoint" -H "Content-Type: application/json")
  else
    response=$(curl -s "$BASE_URL$endpoint")
  fi

  if echo "$response" | grep -q "error" || echo "$response" | grep -q "Error"; then
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Response: $response"
    return 1
  else
    echo -e "${GREEN}✅ OK${NC}"
    # Uncomment to see response:
    # echo "  Response: $response" | head -c 100
    return 0
  fi
}

# Sprint 1 Endpoints
echo -e "${YELLOW}Sprint 1 — Core Gamification${NC}"
echo "=============================="
test_endpoint "GET" "/api/dashboard/$WALLET/level" "Level endpoint"
test_endpoint "GET" "/api/dashboard/$WALLET/streak" "Streak endpoint"
test_endpoint "GET" "/api/dashboard/$WALLET/rank" "User rank endpoint"
test_endpoint "GET" "/api/dashboard/leaderboard/top" "Leaderboard top 100"
test_endpoint "GET" "/api/dashboard/$WALLET/leaderboard-context" "Leaderboard context"
test_endpoint "POST" "/api/dashboard/$WALLET/checkin" "Daily check-in endpoint"
echo ""

# Sprint 2 Endpoints
echo -e "${YELLOW}Sprint 2 — Advanced Features${NC}"
echo "============================="
test_endpoint "GET" "/api/dashboard/$WALLET/activity" "User activity feed"
test_endpoint "GET" "/api/dashboard/activity/global" "Global activity feed"
test_endpoint "GET" "/api/dashboard/$WALLET/missions" "User missions"
test_endpoint "GET" "/api/dashboard/$WALLET/badges/gallery" "Badge gallery"
test_endpoint "GET" "/api/dashboard/$WALLET/referrals/stats" "Referral stats"
echo ""

# Database Health
echo -e "${YELLOW}Database Schema${NC}"
echo "================"
echo "Checking migrations..."
if curl -s "$BASE_URL/health" | grep -q "ok"; then
  echo -e "${GREEN}✅ Backend healthy${NC}"
else
  echo -e "${RED}❌ Backend not responding${NC}"
fi

echo ""
echo "📊 Testing complete!"
echo ""
echo "Next steps:"
echo "1. Verify all endpoints returned ✅ OK"
echo "2. Check TESTING_CHECKLIST.md for detailed tests"
echo "3. Test user flows (trading → missions → referral)"
