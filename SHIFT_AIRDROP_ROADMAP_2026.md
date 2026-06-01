# SHIFT Airdrop Platform — Comprehensive Product Roadmap 2026

**Status**: Strategic Planning Phase  
**Last Updated**: June 1, 2026  
**Document Type**: Implementation Plan + Cost Analysis

---

## Executive Summary

This roadmap outlines **9 major initiatives** to transform SHIFT from a basic airdrop tracker into a premium, multi-feature engagement platform with advanced analytics, gamification, and affiliate capabilities.

**Estimated Total Effort**: 12-16 weeks (full team) | Cost: $30-60K (excluding token incentives)  
**Recommended Approach**: 3 phases with staged rollout to production

---

## Phase Breakdown & Priorities

### 🟢 PHASE 1: Foundation & Polish (Weeks 1-4)
Critical for user experience and system stability

1. **UI/UX Redesign & Mobile Optimization** ⭐ Priority 1
2. **Badge System Completion** ⭐ Priority 1
3. **Synchronization & Data Consistency** ⭐ Priority 1

### 🟡 PHASE 2: Core Features (Weeks 5-10)
Advanced functionality for user engagement

4. **Referral Engine with On-Chain Validation**
5. **Wallet Analytics & Trading Volume Ranking**
6. **Quiz System + Personalized Pop-ups**

### 🔴 PHASE 3: Premium Features (Weeks 11-16)
Advanced analytics and monetization

7. **Dollar-Value Analytics Dashboard**
8. **Affiliate Rewards Engine**
9. **Points Weightage Model Finalization**

---

# DETAILED IMPLEMENTATION PLANS

---

## 1️⃣ UI/UX REDESIGN & MOBILE OPTIMIZATION

### Current State Analysis
- ✅ Frontend deployed on Vercel
- ⚠️ Desktop-first design (not mobile-optimized)
- ⚠️ Generic component library (needs premium styling)
- ⚠️ Limited dark mode support
- ⚠️ No responsive breakpoints for <375px screens

### Deliverables
- [ ] Mobile-first responsive redesign
- [ ] Premium dark theme (Shift's teal/cyan palette)
- [ ] Performance optimization (<2s load time)
- [ ] Accessibility audit (WCAG AA)
- [ ] A/B testing setup for conversion optimization

### Implementation Strategy

#### Step 1: Design System & Component Library (Week 1)
**What**: Create a reusable design system using Tailwind CSS + Figma handoff

**Tech Stack**:
- Figma (design) → Storybook (component library)
- Tailwind CSS 3.x with custom Shift color palette
- shadcn/ui components (pre-built, accessible)

**Breakdown**:
- Color palette: 8 variants (teal primary, neutrals, success/warning/error)
- Typography: 6 scales (heading, body, caption, mono)
- Components: 40+ (button, card, modal, dropdown, form inputs)
- Responsive breakpoints: Mobile (0-640px), Tablet (640-1024px), Desktop (1024px+)

**Effort**: 1 developer + 1 designer, 1 week
**Cost**: $2,500 (designer) + 80 dev hours ($2,400) = **$4,900**

**Recommendation**: Use shadcn/ui as base, customize colors and spacing

---

#### Step 2: Page-by-Page Redesign (Weeks 2-3)
**Pages to redesign** (priority order):
1. **Airdrop Dashboard** (most visited) → Real-time XP/rankings/leaderboard
2. **Holdings/Portfolio** → Card-based layout with collapsible details
3. **Badges** → Grid with tier progression visualization
4. **Leaderboard** → Sortable table with avatar/rank badges
5. **Loyalty History** → Timeline with filtering/export
6. **Referral Program** → Copy-to-clipboard, tracking, payouts

**Mobile-First Approach**:
- Design for 375px width first (iPhone SE)
- Expand to tablet/desktop
- Test on actual devices: iPhone 12 Mini, Pixel 5a, iPad Mini

**Key Patterns**:
- Bottom sheet modals (instead of center dialogs on mobile)
- Swipeable card decks (holdings, badges)
- Sticky header with floating action buttons
- Simplified tables → Card stacks on mobile

**Effort**: 2 designers + 2 developers, 2 weeks
**Cost**: $5,000 (design) + 160 dev hours ($4,800) = **$9,800**

**Tools**:
- Figma for design specs
- Vercel Preview Deployments for stakeholder feedback
- BrowserStack for device testing

---

#### Step 3: Performance Optimization (Week 4)
**Metrics**:
- First Contentful Paint (FCP): <1.2s
- Largest Contentful Paint (LCP): <2.5s
- Cumulative Layout Shift (CLS): <0.1
- Lighthouse Score: >90

**Optimizations**:
- Code splitting by route (Next.js built-in)
- Image optimization (next/image, WebP format)
- Bundle analysis and tree-shaking
- API response caching (React Query with 5-min TTL)
- Database query optimization (add indexes on leaderboard queries)

**Effort**: 1 developer, 1 week
**Cost**: 40 dev hours = **$1,200**

---

#### Step 4: Accessibility & Testing (Week 4)
**Testing Framework**:
- Playwright E2E tests (critical user flows)
- Jest unit tests (components)
- Axe accessibility scans (automated)
- Manual WCAG AA audit

**Critical Flows to Test**:
1. Wallet connect → Dashboard load
2. View holdings → Click position details
3. Copy referral link → Share on social
4. View leaderboard → Filter/sort
5. Claim loyalty rewards

**Effort**: 1 QA + 1 developer, 0.5 weeks
**Cost**: 20 dev hours = **$600**

---

### Phase 1 Cost Summary: UI/UX
| Category | Cost | Notes |
|----------|------|-------|
| Design | $7,500 | 2 designers × 3 weeks |
| Development | $9,000 | 2 devs × 4 weeks (160 hrs) |
| Testing/QA | $600 | 1 QA engineer |
| **Total** | **$17,100** | |

**Timeline**: 4 weeks  
**Team**: 2 designers, 2 developers, 1 QA  
**Tokens Required**: None

---

## 2️⃣ BADGE SYSTEM COMPLETION

### Current State
- ✅ First Trade, Diamond Hands, Long Hauler, The Believer
- ✅ Earnings Reactor, FOMC Trader, Shift Holder
- ✅ Fed Day Trade, CPI Bet, News Reactor, Earnings Conviction, Geopolitical Trade
- ⚠️ Missing: Display, animations, achievement notifications

### Missing Functionality
- [ ] Badge progress visualization (% to unlock)
- [ ] Achievement unlock animations
- [ ] Push notifications on badge earn
- [ ] Badge leaderboards (who has X badge)
- [ ] Daily challenge badges (streak system)
- [ ] Rarity/tier system (Common/Rare/Epic/Legendary)

### Implementation Strategy

#### Tier System Design
**Rarity Levels**:
- **Common** (25% users): First Trade, Shift Holder
- **Rare** (10% users): Diamond Hands, FOMC Trader, News Reactor
- **Epic** (2% users): Long Hauler, Earnings Conviction, Geopolitical Trade
- **Legendary** (<1% users): The Believer, Volume Trader (NEW), Multi-Asset Master (NEW)

**Badge Points Multiplier**:
- Common: 1.0x
- Rare: 1.15x
- Epic: 1.25x
- Legendary: 1.5x

#### Database Schema Updates
```sql
-- Add to badges table
ALTER TABLE badges ADD COLUMN (
  tier VARCHAR(20) DEFAULT 'common',  -- common, rare, epic, legendary
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  progress_pct INT DEFAULT 0,  -- 0-100 for in-progress
  unlock_date TIMESTAMP  -- when badge was earned
);

-- New table: badge_progress (track partial progress)
CREATE TABLE badge_progress (
  id UUID PRIMARY KEY,
  wallet VARCHAR(100),
  badge_name VARCHAR(100),
  progress_type VARCHAR(50),  -- days_held, volume_usd, etc
  current_value NUMERIC,
  target_value NUMERIC,
  created_at TIMESTAMP
);
```

#### Implementation Tasks

**Task 1: Badge Progress UI** (Week 1)
- Progress ring component (circular visual)
- Countdown timer for time-based badges
- Unlock animation (confetti/pulse effect)
- Responsive card layout

**Tech**: React Suspense for animation frame optimization

**Task 2: Push Notifications** (Week 1-2)
- Web push via service worker
- Email notification option (Resend.com - free tier)
- In-app toast notifications (existing, enhance)
- Unsubscribe management

**Integration**:
```typescript
// src/services/notificationService.ts
async notifyBadgeEarned(wallet: string, badge: Badge) {
  // 1. Send push notification
  await sendWebPush(wallet, {
    title: `🏆 Badge Earned: ${badge.name}`,
    body: `You've unlocked ${badge.name}! +${badge.xpBonus} XP`,
    icon: badge.iconUrl,
    tag: `badge-${badge.id}`
  });
  
  // 2. Send email (optional)
  await sendEmail(wallet, {
    template: 'badge_earned',
    data: { badge, tier: badge.tier }
  });
}
```

**Task 3: Achievement Leaderboards** (Week 2)
- Global: "Who has earned this badge?"
- Rarity distribution chart
- First X people to earn badge (hall of fame)

**Task 4: Daily Challenge System** (Week 2-3)
- Daily randomized challenge badge
- Streak tracking (consecutive days)
- Reward multiplier: 1 day = 1x, 7 days = 1.5x, 30 days = 2x
- Reset at UTC midnight

**Database**:
```sql
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  challenge_type VARCHAR(50),  -- quiz, trade_volume, hold_duration
  target_value NUMERIC,
  reward_points INT DEFAULT 50,
  created_at TIMESTAMP
);

CREATE TABLE daily_challenge_completions (
  id UUID PRIMARY KEY,
  wallet VARCHAR(100),
  challenge_id UUID REFERENCES daily_challenges,
  completed_at TIMESTAMP,
  streak_count INT DEFAULT 1
);
```

**Task 5: Visual Assets & Animations** (Week 3)
- 40+ badge SVG icons (Figma export)
- Tier-specific visual treatments (glow, border effects)
- Unlock animation (CSS keyframes)
- Confetti effect library (canvas-confetti)

### Phase 2 Cost Summary: Badges
| Component | Effort | Cost |
|-----------|--------|------|
| Progress UI | 40 hrs | $1,200 |
| Notifications | 60 hrs | $1,800 |
| Leaderboards | 40 hrs | $1,200 |
| Daily Challenges | 60 hrs | $1,800 |
| Assets/Animation | 30 hrs | $900 |
| **Total** | **230 hrs** | **$6,900** |

**Timeline**: 3 weeks  
**Dependencies**: None (can start immediately)  
**Tokens Required**: None

---

## 3️⃣ REFERRAL ENGINE WITH ON-CHAIN VALIDATION

### Current State
- ✅ Basic referral tracking in database
- ⚠️ No on-chain verification of holdings
- ⚠️ No multi-level referrals
- ⚠️ Manual verification process

### New Functionality
- [ ] On-chain holder verification (Helius SPL token API)
- [ ] Referred user holding validation (must hold X SHIFT tokens)
- [ ] Multi-level referrals (2-3 levels deep)
- [ ] Referral code custom URLs
- [ ] Withdrawal system for referral rewards

### Implementation Strategy

#### Architecture
```
Referrer → invites → Referred User
                        ↓
                    (Holds min 100 SHIFT?)
                        ↓
                    ✅ Grant referral bonus
                    📊 Track on-chain
                    💰 Eligible for rewards
```

#### On-Chain Validation Flow
```typescript
// src/services/referralValidationService.ts

async validateReferredUserHolding(wallet: string, minTokens: number = 100) {
  // 1. Check Solana blockchain directly
  const holding = await holdingService.getTokenBalance(
    wallet, 
    SHIFT_TOKEN_MINT
  );
  
  // 2. Log for audit trail
  await logValidation(wallet, holding, minTokens);
  
  // 3. Grant bonus if verified
  if (holding >= minTokens) {
    await grantReferralBonus(wallet);
    return { valid: true, holding };
  }
  
  return { valid: false, holding };
}
```

#### Multi-Level Referrals (2-Level)
**Tier 1**: Direct referrer (100% of referred user's trading volume → points)  
**Tier 2**: Referrer's referrer (10% of referred user's volume → points)

**Example**:
- Alice refers Bob
- Bob refers Charlie
- Charlie trades $1000 of SPX3L
  - Alice earns: 1000 × 5% = **50 points**
  - Bob earns: 1000 × 2.5% = **25 points**
  - Charlie earns: normal XP

**Implementation**:
```sql
CREATE TABLE referral_chain (
  id UUID PRIMARY KEY,
  wallet_l1 VARCHAR(100),  -- Direct referrer
  wallet_l2 VARCHAR(100),  -- Referrer's referrer
  wallet_l3 VARCHAR(100),  -- Tier 3 (optional for future)
  created_at TIMESTAMP
);

-- Track referral earnings
CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY,
  referrer_wallet VARCHAR(100),
  referred_wallet VARCHAR(100),
  tier INT,  -- 1, 2, or 3
  transaction_id UUID,  -- Link to position trade
  earnings_points INT,
  created_at TIMESTAMP
);
```

#### Custom Referral URLs
```
Standard: shiftrwa.xyz/register?ref=ALxicc2wwFYc6SJcSMYrairfQWB9DXVFY956b18Q3T9a
Custom:   shiftrwa.xyz/register?ref=alex-pro
```

**Implementation**:
```typescript
// Allow custom vanity codes
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY,
  wallet VARCHAR(100) UNIQUE,
  vanity_code VARCHAR(20) UNIQUE,  -- alex-pro, trader123
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

// Lookup endpoint
GET /api/referral/lookup/:code
// Resolves: alex-pro → wallet address
```

#### Referral Dashboard UI
```
Your Referral Stats
├─ Referral Link: [Copy button] shiftrwa.xyz/ref/alex-pro
├─ Direct Referrals: 24 users
│  ├─ Active (trading): 18
│  └─ Inactive: 6
├─ Tier 2 Referrals: 156 users
├─ Total Earnings: 5,432 points
│  ├─ This Month: 1,200 points
│  └─ Pending: 340 points (awaiting settlement)
└─ Withdrawal
   ├─ Available Balance: 5,432 points
   ├─ Amount: [input field]
   └─ [Withdraw button] → SOL wallet address
```

#### Withdrawal System
**Settlement Options**:
1. **Loyalty Points** (immediate, no gas)
2. **SOL** (24h settlement, minimal gas fee)
3. **SHIFT Tokens** (if available, proportional to price)

**Anti-Fraud Measures**:
- Minimum withdrawal: 100 points
- Maximum withdrawal: 10K points/month (prevent Sybil)
- 7-day hold period before first withdrawal (prevent churning)
- KYC check for withdrawals >$1000

### Phase 2 Cost Summary: Referral Engine
| Component | Effort | Cost |
|-----------|--------|------|
| On-chain validation | 50 hrs | $1,500 |
| Multi-level tracking | 60 hrs | $1,800 |
| Referral dashboard | 50 hrs | $1,500 |
| Withdrawal system | 40 hrs | $1,200 |
| Testing/security | 30 hrs | $900 |
| **Total** | **230 hrs** | **$6,900** |

**Timeline**: 3-4 weeks  
**Dependencies**: Helius API (already integrated)  
**Tokens Required**: None (points-based)

---

## 4️⃣ WALLET ANALYTICS & TRADING VOLUME RANKING

### What's Needed
- Aggregate trading volume per wallet across all 6 SHIFT tokens
- Rank users by total volume (global leaderboard)
- Individual token volume breakdowns
- Trading frequency metrics (trades/day, avg size)
- Win rate calculation (profitable vs losing trades)

### Data Model
```typescript
interface WalletAnalytics {
  wallet: string;
  totalVolume: number;        // USD across all tokens
  volumeByToken: {
    TSL2L: number;
    TSL1S: number;
    // ... 5 more tokens
  };
  tradesCount: number;
  avgTradeSize: number;
  profitabilityRate: number;  // % of trades that gained points
  tradingFrequency: {
    tradesPerDay: number;
    lastTradedAt: Date;
  };
  holding: {
    currentPositions: number;
    averageHoldDays: number;
  };
}
```

### Implementation

#### Database Queries (Query Optimization)
```sql
-- Materialized view for performance (refresh every 6 hours)
CREATE MATERIALIZED VIEW wallet_analytics_snapshot AS
SELECT 
  w.wallet,
  SUM(p.position_size_usd) as total_volume_lifetime,
  COUNT(p.id) as total_trades,
  AVG(p.position_size_usd) as avg_trade_size,
  MAX(p.created_at) as last_traded_at
FROM users w
LEFT JOIN positions p ON w.wallet = p.wallet
GROUP BY w.wallet;

-- Index for leaderboard queries
CREATE INDEX idx_wallet_volume ON wallet_analytics_snapshot(total_volume_lifetime DESC);

-- Volume by token (separate materialization for detail views)
CREATE MATERIALIZED VIEW wallet_volume_by_token AS
SELECT 
  w.wallet,
  p.asset,
  SUM(p.position_size_usd) as volume,
  COUNT(p.id) as trade_count
FROM users w
LEFT JOIN positions p ON w.wallet = p.wallet
GROUP BY w.wallet, p.asset;
```

#### API Endpoints

```typescript
// GET /api/analytics/wallet/:wallet
// Returns full analytics for a wallet
{
  wallet: "...",
  rank: 47,
  totalVolume: 5420.50,
  volumeByToken: {
    TSL2L: 2100.00,
    SPX3L: 1850.50,
    SOX3L: 1470.00,
    // ...
  },
  trades: {
    count: 24,
    avgSize: 225.85,
    lastTradedAt: "2026-06-01T10:30:00Z"
  },
  profitability: {
    successRate: 0.75,  // 75% of positions earn XP
    totalXpEarned: 542.23
  },
  streak: {
    holdingDays: 14,
    consecutiveProfitable: 5
  }
}

// GET /api/analytics/leaderboard?sort=volume&limit=100
// Global volume ranking
[
  { rank: 1, wallet: "0x123...", volume: 45200, trades: 120 },
  { rank: 2, wallet: "0x456...", volume: 38500, trades: 105 },
  // ...
]

// GET /api/analytics/token/:token/leaderboard
// Token-specific volume ranking
[
  { rank: 1, wallet, volume: 12500, trades: 45 },
  // ...
]
```

#### Frontend Visualization

**Analytics Page Components**:
1. **Summary Cards**
   - Total Volume (USD)
   - Global Rank
   - Trading Frequency (trades/day)
   - Current Streak (consecutive profitable days)

2. **Volume Breakdown** (Pie/Donut chart)
   - % of volume per token
   - Color-coded by token (TSL=cyan, SPX=teal, SOX=navy)

3. **Trading Timeline** (Line chart)
   - Daily volume over last 30 days
   - Trend indicator (↑ ↓)

4. **Token Comparison Table**
   - Token name, volume, trades, avg size, win rate

5. **Leaderboard**
   - User's rank, peer comparison (top 1%, top 10%, etc)
   - Sortable by: volume, trades, profitability

### Phase Cost Summary: Analytics
| Component | Effort | Cost |
|-----------|--------|------|
| Database views/indexes | 30 hrs | $900 |
| API endpoints | 40 hrs | $1,200 |
| Frontend components | 60 hrs | $1,800 |
| Charts/visualization | 40 hrs | $1,200 |
| **Total** | **170 hrs** | **$5,100** |

**Timeline**: 2-3 weeks  
**Dependencies**: None  
**Tokens Required**: None

---

## 5️⃣ QUIZ SYSTEM + PERSONALIZED POP-UPS

### Daily Quiz Mechanics
- **Frequency**: 1 quiz per user per day
- **Reward**: 50-100 points (varies by difficulty)
- **Duration**: 3 multiple-choice questions, 2 minutes total
- **Topics**: SHIFT platform, Solana, DeFi, risk management

### Implementation

#### Quiz Database Schema
```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY,
  question TEXT NOT NULL,
  options JSON,  -- [{text, isCorrect}]
  difficulty INT,  -- 1=easy, 2=medium, 3=hard
  topic VARCHAR(50),  -- shift_platform, solana, defi, risk
  created_at TIMESTAMP
);

CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY,
  wallet VARCHAR(100),
  date DATE NOT NULL,
  questions JSON,  -- [{id, userAnswer, isCorrect}]
  score INT,
  reward_points INT,
  completed_at TIMESTAMP,
  UNIQUE(wallet, date)
);

CREATE TABLE user_quiz_streak (
  wallet VARCHAR(100) PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_completed_date DATE,
  multiplier NUMERIC DEFAULT 1.0  -- 1.0 = 1x, 1.5 = 7-day, 2.0 = 30-day
);
```

#### Daily Quiz Workflow
```typescript
// src/services/quizService.ts

async getDailyQuiz(wallet: string) {
  // 1. Check if user completed today
  const completed = await checkQuizCompletedToday(wallet);
  if (completed) return { alreadyCompleted: true };
  
  // 2. Get 3 random questions (no repeats from last 7 days)
  const questions = await getRandomQuestions(3, wallet);
  
  // 3. Start session
  const session = await createQuizSession(wallet, questions);
  
  return {
    sessionId: session.id,
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options.map(o => ({ text: o.text }))  // hide isCorrect
    })),
    timeLimit: 120  // seconds
  };
}

async submitQuizAnswers(sessionId: string, answers: Answer[]) {
  const session = await getSession(sessionId);
  
  // Score the answers
  let correctCount = 0;
  answers.forEach((answer, idx) => {
    const question = session.questions[idx];
    const correct = question.options.find(o => o.isCorrect);
    if (answer.optionText === correct.text) correctCount++;
  });
  
  // Calculate reward
  const baseReward = 50;  // 50 points for 3/3
  const reward = Math.ceil(baseReward * (correctCount / 3));
  
  // Update streak
  const streak = await updateStreak(session.wallet);
  const multipliedReward = Math.ceil(reward * streak.multiplier);
  
  // Credit points
  await creditPoints(session.wallet, multipliedReward);
  
  return {
    score: `${correctCount}/3`,
    reward: multipliedReward,
    streak: streak.current_streak,
    multiplier: streak.multiplier
  };
}
```

#### Personalized Pop-ups

**Trigger Points**:
1. **On Login**: "Daily quiz available! +50 points"
2. **After Position Close**: "Great trade! Complete quiz for bonus points"
3. **Referral Success**: "Friend joined! Take quiz to celebrate +100 points"
4. **Streak Milestone**: "7-day quiz streak! Unlock 1.5x multiplier"

**Pop-up Types**:
```typescript
interface PopUp {
  id: string;
  type: 'quiz' | 'achievement' | 'promotion' | 'event';
  title: string;
  message: string;
  cta: { text: string; action: string };  // "Take Quiz", "Claim Reward"
  imageUrl?: string;
  priority: 'high' | 'normal' | 'low';
  dismissible: boolean;
  expiresAt?: Date;
}

// Random rotation system
const popupTemplates = [
  { title: '🧠 Brain Break!', message: 'Daily quiz ready' },
  { title: '🎯 Test Your Skills', message: 'Prove your SHIFT knowledge' },
  { title: '💡 Learn & Earn', message: 'Complete today\'s challenge' },
  { title: '🚀 Knowledge is Power', message: 'Quiz unlocks bonus points' }
];

function getRandomPopup(wallet: string) {
  const template = popupTemplates[Math.random() * popupTemplates.length];
  return template;
}
```

**Frontend Implementation** (React):
```typescript
// components/DailyQuizPopup.tsx
export function DailyQuizPopup({ onClose }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  
  useEffect(() => {
    if (!hasCompletedToday()) {
      fetchQuiz().then(setQuiz);
    }
  }, []);
  
  if (!quiz) return null;
  
  return (
    <Dialog open={true}>
      <DialogContent>
        <h2>{quiz.questions.length} Questions • 2 Minutes</h2>
        <QuizQuestion 
          q={quiz.questions[currentQ]} 
          onAnswer={handleAnswer}
        />
        <button onClick={submitAnswers}>Submit</button>
        <button onClick={onClose}>Maybe Later</button>
      </DialogContent>
    </Dialog>
  );
}
```

### Cost Summary: Quiz System
| Component | Effort | Cost |
|-----------|--------|------|
| Quiz backend | 50 hrs | $1,500 |
| Streak system | 30 hrs | $900 |
| Pop-up system | 40 hrs | $1,200 |
| Frontend UI | 60 hrs | $1,800 |
| Content (50 questions) | 10 hrs | $300 |
| **Total** | **190 hrs** | **$5,700** |

**Timeline**: 2-3 weeks  
**Dependencies**: None  
**Tokens Required**: None (points-based rewards)

---

## 6️⃣ DOLLAR-VALUE ANALYTICS DASHBOARD

### Executive Analytics for Admins

**Metrics Dashboard**:
- Total TVL (Total Value Locked in positions)
- Daily trading volume (USD)
- Average position size
- User segmentation by buying power ($<100, $100-1K, $1K-10K, $10K+)
- Revenue metrics (if applicable)

**Implementation**:
```sql
-- Revenue tracking (future monetization)
CREATE TABLE revenue_streams (
  id UUID PRIMARY KEY,
  source VARCHAR(50),  -- 'trading_fees', 'premium_features', 'affiliate'
  amount NUMERIC,
  date DATE,
  created_at TIMESTAMP
);

-- User segmentation view
CREATE MATERIALIZED VIEW user_segments AS
SELECT 
  CASE 
    WHEN total_volume_lifetime < 100 THEN 'micro'
    WHEN total_volume_lifetime < 1000 THEN 'mini'
    WHEN total_volume_lifetime < 10000 THEN 'standard'
    ELSE 'whale'
  END as segment,
  COUNT(*) as user_count,
  SUM(total_volume_lifetime) as total_tvl,
  AVG(total_volume_lifetime) as avg_volume,
  MAX(total_volume_lifetime) as max_volume
FROM wallet_analytics_snapshot
GROUP BY segment;
```

**API**:
```typescript
GET /api/admin/analytics/overview
{
  tvl: 2540000,  // Total value locked USD
  dailyVolume: 145000,
  uniqueTraders: 487,
  segments: {
    whale: { count: 12, tvl: 1200000 },
    standard: { count: 89, tvl: 890000 },
    mini: { count: 156, tvl: 340000 },
    micro: { count: 230, tvl: 110000 }
  },
  topTraders: [...]
}
```

**Cost**: 80 dev hours = **$2,400**

---

## 7️⃣ AFFILIATE REWARDS ENGINE

### Commission Structure

**Volume-Based Model** (Recommended):
- Referred user trades $1,000 of SHIFT tokens
- Referrer earns: $1,000 × 5% = **50 points**
- Referrer's referrer earns: $1,000 × 1% = **10 points**

**Tier Multipliers**:
- Top 10 affiliates: 1.5x commission
- Top 50 affiliates: 1.25x commission
- All others: 1.0x commission

**Implementation**:
```typescript
// src/services/affiliateService.ts

async creditAffiliateCommission(tradedWallet: string, tradeAmount: number) {
  // 1. Find referrer(s)
  const referrer = await getReferrer(tradedWallet);
  const tier2Referrer = await getReferrer(referrer.wallet);
  
  // 2. Get multiplier (top 10/50)
  const tier1Multiplier = await getAffiliateMultiplier(referrer.wallet);
  const tier2Multiplier = await getAffiliateMultiplier(tier2Referrer?.wallet);
  
  // 3. Calculate commission
  const tier1Commission = tradeAmount * 0.05 * tier1Multiplier;
  const tier2Commission = tradeAmount * 0.01 * tier2Multiplier;
  
  // 4. Credit to SNAG loyalty system
  await creditPoints(referrer.wallet, Math.ceil(tier1Commission));
  if (tier2Referrer) {
    await creditPoints(tier2Referrer.wallet, Math.ceil(tier2Commission));
  }
  
  // 5. Log for analytics
  await logAffiliateTransaction({
    referrer: referrer.wallet,
    referred: tradedWallet,
    tradeAmount,
    commissionEarned: tier1Commission,
    tier: 1
  });
}
```

**Affiliate Dashboard**:
```
My Affiliate Program
├─ Commission Rate: 5% of referred user volume
├─ Referrals This Month
│  ├─ New: 5 users
│  ├─ Active Trading: 12 users
│  └─ Total Volume Generated: $45,320
├─ Earnings
│  ├─ This Month: 2,267 points
│  ├─ All Time: 18,945 points
│  └─ Rank: Top 15 (1.25x multiplier)
└─ Top Referred Users
   ├─ User A: $12,450 volume → earned $623
   ├─ User B: $8,200 volume → earned $410
```

**Cost**: 120 dev hours = **$3,600**

---

## 8️⃣ POINTS WEIGHTAGE MODEL

### Current State
Points come from:
- On-chain trading (XP from positions)
- Social engagement (referrals, quizzes)
- Loyalty tasks (via SNAG)

### Proposed Weighting (for TGE airdrop allocation)

```
Total SHIFT Tokens = 100 units

└─ On-Chain Activity: 60%
   ├─ Trading Volume (XP): 45%
   ├─ Position Duration (Hold Multiplier): 10%
   └─ Consistency (Daily/Weekly Streaks): 5%

└─ Social & Referral: 25%
   ├─ Referral Volume: 15%
   ├─ Referral Tier Bonuses: 5%
   └─ Quiz/Community Engagement: 5%

└─ Ecosystem Participation: 10%
   ├─ SHIFT Holder Badge: 5%
   ├─ Multiple Token Holder: 3%
   └─ Event Participation: 2%

└─ Loyalty Tasks (SNAG): 5%
   ├─ Social Media Tasks: 3%
   └─ Community Involvement: 2%
```

### Multiplier Stacking Rules

**Do multipliers stack?** YES, with caps

```
Base XP = log10(position_size_usd) × 100

Multiplier Stack:
  × Token Base (1.2-1.25)
  × Time Hold (1.0 - 3.0, grows 0.1/week)
  × Launch Bonus (3.0 week1, 2.0 week2, 1.0+ week3)
  × Loyalty Tier (1.0-1.5x for top affiliates)

MAX CAP: 5.0x

Example:
  $100 position, TSL2L, 14 days, Launch Week 2
  = 100 × 1.2 × 2.0 × 2.0 × 1.0 = 480 XP
  (capped at 5.0x = 100 × 5.0 = 500 XP)
```

### Implementation

```typescript
// src/services/pointsWeightageService.ts

interface PointsBreakdown {
  onChainXP: number;
  referralPoints: number;
  quizPoints: number;
  snagPoints: number;
  loyaltyBonuses: number;
  totalPoints: number;
  percentages: {
    onChain: number;
    referral: number;
    social: number;
    snag: number;
  };
}

async calculateUserPoints(wallet: string): PointsBreakdown {
  // 1. On-chain XP (60%)
  const positions = await getOpenPositions(wallet);
  const onChainXP = positions.reduce((sum, p) => sum + p.xpGenerated, 0);
  
  // 2. Referral points (25%)
  const referralEarnings = await getReferralEarnings(wallet);
  const referralPoints = referralEarnings.sum;
  
  // 3. Quiz points (5%)
  const quizPoints = await getQuizPoints(wallet);
  
  // 4. SNAG loyalty points (5%)
  const snagPoints = await getSNAGPoints(wallet);
  
  // 5. Bonus multipliers
  const loyaltyBonus = await calculateLoyaltyBonus(wallet);
  
  const total = (onChainXP * 0.6) + 
                (referralPoints * 0.25) + 
                (quizPoints * 0.05) + 
                (snagPoints * 0.05);
  
  return {
    onChainXP,
    referralPoints,
    quizPoints,
    snagPoints,
    loyaltyBonuses: loyaltyBonus,
    totalPoints: total * (1 + loyaltyBonus),
    percentages: {
      onChain: (onChainXP / total) * 100,
      referral: (referralPoints / total) * 100,
      social: (quizPoints / total) * 100,
      snag: (snagPoints / total) * 100
    }
  };
}
```

**Cost**: 60 dev hours = **$1,800**

---

## 9️⃣ SYNCHRONIZATION & SYSTEM CONSISTENCY

### Current Issues
- ⚠️ Helius webhook reliability (works intermittently)
- ⚠️ Position sync delays (5-10 seconds)
- ⚠️ XP calculation timing inconsistencies
- ⚠️ Database indexing slow for large queries

### Solutions

#### 1. Webhook Reliability (Week 1)
- Implement webhook retries with exponential backoff
- Add webhook health monitoring (Pingdom / UptimeRobot)
- Fallback: automatic sync on wallet connect (already in place)

**Cost**: 40 dev hours = **$1,200**

#### 2. Position Sync Optimization (Week 2)
- Add database indexes on frequently queried columns
  ```sql
  CREATE INDEX idx_positions_wallet ON positions(wallet, status);
  CREATE INDEX idx_positions_opened_at ON positions(opened_at DESC);
  ```
- Query caching (Redis, 5-min TTL)
- Batch operations (group position closes, bulk XP updates)

**Cost**: 60 dev hours = **$1,800**

#### 3. XP Calculation Consistency (Week 2)
- Add transaction locks (SERIALIZABLE isolation level)
- Prevent double-counting with processed_transactions dedup
- Add audit logging for all XP changes

**Cost**: 50 dev hours = **$1,500**

**Total Phase Cost**: **$4,500**

---

# CONSOLIDATED ROADMAP SUMMARY

## Timeline Overview

```
Week 1-4:   PHASE 1 — Foundation & Polish
├─ UI/UX Redesign & Mobile (Week 1-4)
├─ Badge System Completion (Week 1-3)
└─ System Consistency Fixes (Week 1-2)

Week 5-10:  PHASE 2 — Core Features
├─ Referral Engine (Week 5-8)
├─ Analytics & Leaderboards (Week 6-8)
├─ Quiz System (Week 7-9)
└─ Affiliate Rewards (Week 9-10)

Week 11-16: PHASE 3 — Polish & Launch
├─ Points Weightage Finalization (Week 11)
├─ Dollar-Value Dashboard (Week 12)
├─ QA & Integration Testing (Week 13-14)
├─ User Documentation (Week 15)
└─ Production Deployment (Week 16)
```

## Cost Breakdown by Phase

| Phase | Component | Cost |
|-------|-----------|------|
| **PHASE 1** | UI/UX Design | $17,100 |
| | Badge System | $6,900 |
| | System Fixes | $4,500 |
| | **Phase 1 Total** | **$28,500** |
| | | |
| **PHASE 2** | Referral Engine | $6,900 |
| | Analytics | $5,100 |
| | Quiz System | $5,700 |
| | Affiliate Rewards | $3,600 |
| | **Phase 2 Total** | **$21,300** |
| | | |
| **PHASE 3** | Points Weightage | $1,800 |
| | Dollar-Value Dashboard | $2,400 |
| | QA/Testing | $3,000 |
| | Documentation | $2,000 |
| | **Phase 3 Total** | **$9,200** |
| | | |
| **GRAND TOTAL** | | **$59,000** |

## Team Composition (Full-Time)

```
6-8 Week Sprint:
├─ 2x Frontend Developers (@$150/hr)
├─ 2x Backend Developers (@$150/hr)
├─ 1x Designer (@$120/hr)
├─ 1x QA Engineer (@$100/hr)
└─ 1x Product Manager (coordination)
```

**OR** (More Efficient - Recommended)

```
12-16 Week Sprint:
├─ 1x Full-Stack Developer (@$150/hr)
├─ 1x Backend Developer (@$150/hr)
├─ 1x Frontend Developer (@$150/hr)
├─ 1x Designer (part-time 20hrs/wk @$120/hr)
└─ 1x QA Engineer (part-time 10hrs/wk @$100/hr)

Total: 80-100 hrs/week × 16 weeks × $150 avg = ~$48K dev + $20K design/QA
```

---

# QUESTIONS FOR CLARIFICATION

**Please provide answers to the following to finalize the roadmap:**

1. **Timeline**: What's your target launch date? (ASAP, Q3 2026, Q4 2026?)
2. **Budget**: Is $59K total feasible, or should we reduce scope?
3. **Team**: Can you allocate 3-4 developers or will I be handling most of the work?
4. **Referral Model**: 
   - Single or multi-level? (I recommend 2-level)
   - Withdrawal in points or tokens?
5. **Quiz**: 
   - Daily mandatory or optional?
   - Progressive difficulty or random?
6. **Analytics Dashboard**: 
   - Public (all users) or admin-only?
   - Real-time or daily snapshots?
7. **Mobile Priority**: 
   - Equally important to desktop, or secondary?
8. **Tokens**: 
   - Any plan to issue SHIFT tokens for rewards?
   - Or points-only system?
9. **Third-party Services**: 
   - Approved budget for services? (design tools, analytics, etc.)
10. **Phase Priority**: 
   - Must all 3 phases ship together, or can Phase 3 wait?

---

# NEXT STEPS

1. **Review this plan** and mark items ✅ approved or ❌ revise
2. **Answer the clarifying questions** above
3. **Schedule 30-min kickoff meeting** to finalize roadmap
4. **Create JIRA/Linear tickets** for each component
5. **Start Phase 1 immediately** (design + badge system)

**Expected outcome**: Ship Phase 1 features in 4 weeks, Phase 2 by week 10, Phase 3 complete for launch day.

---

**Document prepared**: June 1, 2026  
**Last updated**: June 1, 2026  
**Status**: Ready for review and planning meeting
