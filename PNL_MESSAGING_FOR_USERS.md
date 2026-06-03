# 📢 P&L Messaging for Users

This document contains all the messages that should appear in the UI to prevent user confusion about P&L accuracy and update frequency.

---

## Key Message: "It's Not Real-Time, But It's Accurate"

**Goal:** Users should understand:
- ✅ Entry prices (from blockchain) = 100% accurate
- ⏱️ Current prices (from Jupiter) = Cached, updates every 5 minutes
- 🔄 Dashboard refreshes automatically every 60 seconds
- 🖱️ Users can manually refresh for instant update

---

## 1. Dashboard P&L Stat Tooltip

**Location:** Info icon (ⓘ) next to "Portfolio P&L" in stats grid

**Title:** Portfolio P&L

**Accuracy Statement (Yellow/Amber Box):**
```
"P&L is calculated using prices cached for 5 minutes. 
Dashboard auto-refreshes every 60 seconds. Entry prices 
are extracted from blockchain and are 100% accurate."
```

**Details (Bulleted List):**
```
💰 Prices: Cached for 5 minutes (Jupiter API called once per cycle)

🔄 Dashboard: Auto-refreshes every 60 seconds while page is open

⏱️ Manual refresh: Click "Refresh" button for instant price update

📊 RWA tokens: Use fallback prices (TSL2L $22.07, etc.)
              Updated monthly based on blockchain data

✅ Entry prices: Extracted from your swap transaction on blockchain
              (100% accurate, never updated)

⚙️ Current prices: Fetched from Jupiter DEX price feed
              Updated in real-time, cached for 5 minutes by us
```

**Footer:**
```
💡 Tip: For latest prices, click the Refresh button anytime
```

---

## 2. Position-Level P&L Tooltip

**Location:** Info icon (ⓘ) next to "P&L" in each position row

**Title:** Position P&L

**Accuracy Statement (Yellow/Amber Box):**
```
"Position P&L shows unrealized gains/losses based on 
current cached prices. Real-time prices are available 
anytime via the Refresh button."
```

**Details (Bulleted List):**
```
📈 Unrealized P&L: (Current Price - Entry Price) × Token Amount
                   Only applies to OPEN positions

🔗 Entry Price: Extracted from your swap transaction on blockchain
               Stored permanently in our database
               100% accurate

💾 Current Price: Fetched from Jupiter every 5 minutes
                Cached to reduce API calls
                May be up to 5 minutes old

🟢 Gains: Shows in green when current price > entry price
         Example: +$10.76 (+10.70%)

🔴 Losses: Shows in red when current price < entry price
          Example: -$5.32 (-4.21%)

⚙️ Manual Refresh: Updates all prices immediately
                  No waiting for next 60-second cycle
```

**Footer:**
```
💡 Entry prices never change. Only current prices are cached.
```

---

## 3. Closed Position (History Tab) Message

**Location:** Each closed position in History tab

**Display Format:**
```
[Asset Badge] | [Hold Duration] | [Multiplier] | [XP/week]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Entry Price: $22.12
Exit Price:  $24.50
Realized P&L: 🟢 +$10.76 (+10.70%)
```

**Tooltip (if hovering on Realized P&L):**
```
Title: Realized P&L (Closed Position)

Accuracy: "This is your actual profit or loss from this trade.
Both entry and exit prices were extracted from blockchain."

Details:
✅ Entry: Extracted from buy transaction on blockchain
✅ Exit: Extracted from sell transaction on blockchain
💯 Accuracy: 100% — based on real blockchain data
```

---

## 4. Inline Explanatory Text

**Use this in:** Modals, help pages, onboarding

```markdown
### How P&L Updates

Your portfolio P&L is calculated using:

1. **Entry Prices** (100% Accurate)
   - Extracted from your swap transaction on the Solana blockchain
   - Never changes
   - Always reflects what you actually paid

2. **Current Prices** (Cached, ~5 min old)
   - Fetched from Jupiter DEX price oracle
   - Cached for 5 minutes to reduce API calls
   - Auto-updates every 60 seconds on dashboard
   - Latest prices available anytime by clicking Refresh

3. **Dashboard Refresh**
   - Auto-refresh: Every 60 seconds (while page is open)
   - Manual refresh: Click the Refresh button for instant update
   - Response time: <500ms with cached prices

### Why Not Real-Time?

Real-time prices would require:
- ❌ Thousands of API calls per second
- ❌ Significant server cost
- ❌ Complex WebSocket infrastructure

Instead, we update **every 5 minutes** which is:
- ✅ More than sufficient for P&L tracking
- ✅ Cost-efficient
- ✅ Still fast enough to catch major price movements

### When P&L Updates

| Event | P&L Updates |
|-------|------------|
| New trade (buy/sell) | Immediately (next 60s refresh) |
| Price movement | Every 5 minutes (cached refresh) |
| Manual refresh click | Instantly (<500ms) |
| Auto-refresh cycle | Every 60 seconds |
| Closing a position | Realized P&L recorded on blockchain |

### Real-Time Alternative

Want real-time P&L? Click the **Refresh** button to get latest Jupiter prices instantly.
```

---

## 5. Error Messages & Fallback States

### If Price Fetch Fails
```
⚠️ "Price unavailable — using latest cached price ($22.07)"

Explanation: "We couldn't fetch the latest price from Jupiter 
right now, so showing you the last price we cached. Try refreshing 
in a moment."
```

### If Position Has No Entry Price
```
⚪ "P&L not available"

Explanation: "Entry price wasn't recorded for this position. 
This can happen for positions created before P&L tracking was added. 
Entry prices are extracted from blockchain for new positions going forward."
```

### If No Active Positions
```
"No active positions to calculate P&L"

Explanation: "Open a position on Jupiter to start earning P&L."
```

---

## 6. FAQ Additions (For Help/FAQ Page)

### Q: Why is my P&L different from [Exchange Name]?

**A:** Our P&L is calculated differently:

**Our Method:**
- Entry price: From your actual swap transaction on blockchain
- Current price: Jupiter price at the moment you refresh
- Calculation: (Current - Entry) × Your Token Amount

**Their Method (Usually):**
- May use mid-price, not actual execution price
- May include platform fees
- May use different oracle source

**Result:** Our P&L is more accurate because it's based on YOUR actual trade, not an exchange's estimated price.

---

### Q: Why does P&L show one price but Jupiter shows different?

**A:** Two reasons:

1. **Timing:** We cache Jupiter prices for 5 minutes. Jupiter updates in real-time. If you refresh, they should match.

2. **Price Source:** 
   - We use Jupiter's price oracle (route-average)
   - Jupiter website may use spot prices (current depth)
   - These can differ slightly due to liquidity

**Solution:** Click Refresh for the latest Jupiter price.

---

### Q: Is P&L real-time like a trading app?

**A:** No, but that's fine:

- ❌ **Real-time:** Updated every millisecond (trading apps)
- ✅ **Our Model:** Updated every 5 minutes, refreshes every 60s

**Why?** Real-time would require WebSockets + massive infrastructure. For P&L tracking (not active trading), 5-min updates are plenty. Major moves are still captured quickly.

**If you need latest price:** Click Refresh button (instant).

---

### Q: Can I trust the Entry Price shown?

**A:** Yes, 100%:

- **Source:** Extracted from your actual Solana blockchain swap transaction
- **Accuracy:** What you actually paid per token
- **Immutability:** Recorded on blockchain, never changes

We don't guess or estimate entry prices—we read them directly from your transaction.

---

### Q: What's the "RWA Fallback Price"?

**A:** When Jupiter can't fetch prices for SHIFT RWA tokens, we use fallback prices:

- **TSL2L:** $22.07 (based on historical blockchain data)
- **SOX3L:** $216.39
- Etc.

**These are:**
- ✅ Updated monthly
- ✅ Based on blockchain swap averages
- ✅ Reasonable estimates

**They're not real-time, but they keep P&L working for RWA tokens.**

---

## 7. Loading States & Feedback

### While Dashboard is Loading P&L
```
"Fetching prices..."
[Skeleton loader]

Explanation: "We're getting the latest price data from Jupiter. 
This usually takes <500ms."
```

### After Manual Refresh
```
"📍 Updated just now"

Display for 3 seconds, then fade to normal timestamp.
```

### Stale Price Warning (>5 min without refresh)
```
"⚠️ Prices may be up to 5 minutes old 
   (Auto-refresh paused if page inactive)"

Display only if page is visible but auto-refresh hasn't fired 
in >5 minutes (e.g., user went AFK).
```

---

## 8. What NOT to Say (Common Mistakes)

❌ **DON'T say:**
- "Real-time P&L"
- "Live prices"
- "Instant updates"
- "All prices are 100% accurate" (current prices are cached)

✅ **DO say:**
- "P&L based on cached prices (updated every 5 minutes)"
- "Dashboard refreshes every 60 seconds"
- "Click Refresh for latest prices"
- "Entry prices extracted from blockchain (100% accurate)"

---

## 9. Rollout Message (Day 1 Announcement)

**Headline:**
```
🎉 Portfolio P&L is now live!

Track your SHIFT position gains and losses in real time.
```

**Body:**
```
We've added P&L (Profit & Loss) tracking to your dashboard.

✅ What you'll see:
  • Portfolio P&L summary in the stats grid
  • Individual P&L for each position
  • Realized P&L for closed trades in History
  • Green 🟢 for gains, Red 🔴 for losses

⏱️ How it updates:
  • Dashboard refreshes automatically every 60 seconds
  • Prices cached for 5 minutes (1 API call per cycle)
  • Manual refresh available anytime (click the Refresh button)
  • Entry prices extracted from blockchain (100% accurate)

💡 Pro tip:
  Click the info icon (ⓘ) next to "Portfolio P&L" to see details
  about how P&L is calculated and when it updates.

🔗 Learn more:
  See our FAQ for common questions about P&L accuracy.
```

---

## Summary: User-Facing Accuracy Claims

**Always accurate:**
- ✅ Entry prices (from blockchain)
- ✅ Realized P&L (closed positions)
- ✅ Token amounts you hold
- ✅ Multiplier calculations
- ✅ Historical data

**Cached (up to 5 min old):**
- ⏱️ Current prices
- ⏱️ Unrealized P&L
- ⏱️ RWA token prices

**Real-time alternatives:**
- 🖱️ Click Refresh button → Instant update
- 🔄 Auto-refresh → Every 60 seconds
- 🔗 Use Jupiter website → Spot prices

---

## Testing the Messaging

✅ **Checklist:**

- [ ] Tooltip appears on hover
- [ ] Tooltip explains 5-min cache
- [ ] Tooltip explains 60-sec refresh
- [ ] Tooltip explains entry prices are accurate
- [ ] No claim of "real-time" anywhere
- [ ] Green/red badges work
- [ ] Refresh button updates P&L
- [ ] Auto-refresh every 60s works
- [ ] No user confusion in feedback

