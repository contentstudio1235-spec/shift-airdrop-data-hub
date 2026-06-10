# Vercel Setup & UI/UX Optimization Guide

## 🚀 Vercel Configuration

### 1. Environment Variables Setup
**Location**: Vercel Project Settings → Environment Variables

Add the following variables for the `production` environment:

```env
# SNAG Loyalty Page
NEXT_PUBLIC_SNAG_LOYALTY_URL=https://loyalty.shiftrwa.xyz

# SHIFT Airdrop Domain
NEXT_PUBLIC_AIRDROP_DOMAIN=airdrop.shiftrwa.xyz
NEXT_PUBLIC_AIRDROP_URL=https://airdrop.shiftrwa.xyz

# API Configuration
NEXT_PUBLIC_API_URL=https://shift-airdrop-backend.onrender.com

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_stzLYR66QWH9zePE5TkExUM2r8rbsUdFTbdomasrPG2r
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_NAME=ShiftRWABot
```

### 2. Build & Deployment Settings

**Build Command**:
```bash
npm run build
```

**Output Directory**:
```
.next
```

**Node.js Version**: 18.17.0 or later (configure in `vercel.json` or Vercel dashboard)

**Framework**: Next.js (auto-detected)

### 3. Vercel Configuration File
Create `vercel.json` in the root directory (optional, but recommended):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_API_URL": "@next_public_api_url",
    "NEXT_PUBLIC_SNAG_LOYALTY_URL": "@next_public_snag_loyalty_url",
    "NEXT_PUBLIC_AIRDROP_URL": "@next_public_airdrop_url"
  },
  "functions": {
    "frontend/**": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### 4. Custom Domain Setup
- Primary domain: `airdrop.shiftrwa.xyz`
- Add CNAME record pointing to Vercel deployment
- Enable auto-renewal and SSL certificate

### 5. Preview Deployments
- Enable automatic previews for all branches
- Helpful for testing before main branch merge

---

## 🎨 UI/UX Optimization Checklist

### A. Performance Optimization

#### 1. Image Optimization
- [ ] Use Next.js `Image` component for all images
- [ ] Add proper `alt` text to all images
- [ ] Implement responsive images with `srcSet`
- [ ] Compress all images (target: <100KB for web images)
- [ ] Use WebP format with PNG fallback

**Action**: Audit all image usage in:
- `/airdrop/page.tsx`
- `/register/RegisterContent.tsx`
- Dashboard cards and badges

#### 2. Code Splitting
- [ ] Verify dynamic imports for heavy components
- [ ] Check bundle size with `npm run analyze`
- [ ] Lazy load below-fold components

#### 3. Font Optimization
- [ ] Use system fonts or font-display: swap
- [ ] Minimize custom fonts (target: 2-3 fonts max)
- [ ] Preload critical fonts in `layout.tsx`

**Current fonts to review**:
- Space Mono (monospace)
- Inter or custom fonts in CSS

#### 4. API & Data Fetching
- [ ] Implement request deduplication
- [ ] Add proper loading states for all API calls
- [ ] Use React Query or SWR for caching
- [ ] Implement error boundaries for API failures

**Files to review**:
- `lib/api.ts` - Add retry logic and request caching
- `app/airdrop/page.tsx` - Add skeleton loaders
- `app/register/RegisterContent.tsx` - Add error states

---

### B. Mobile Responsiveness

#### 1. Viewport & Touch Targets
- [ ] Min touch target size: 48x48px (all buttons)
- [ ] Proper viewport meta tag in `layout.tsx`
- [ ] Test on iPhone SE, iPhone 12, iPhone 14, Android devices
- [ ] No horizontal scrolling at any viewport

**Files to test**:
- `/airdrop/page.tsx` - Referral card layout
- `/register/RegisterContent.tsx` - Form inputs
- Wallet modal - Button spacing

#### 2. Mobile-Specific Issues
- [ ] Test all modals on mobile (exit buttons accessible)
- [ ] Input fields have adequate padding
- [ ] Copy/share buttons have enough space
- [ ] No fixed positioning that blocks content
- [ ] Toast notifications don't overlap important UI

#### 3. Responsive Breakpoints
Ensure design adapts at:
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12)
- [ ] 425px (mobile landscape)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)
- [ ] 1280px (wide desktop)

**Priority files**:
- `app/airdrop/page.tsx` - Dashboard grid layout
- `app/register/RegisterContent.tsx` - Queue hero card
- All modal components

---

### C. Accessibility (WCAG 2.1 AA)

#### 1. Color Contrast
- [ ] All text ≥4.5:1 contrast ratio (normal text)
- [ ] UI components ≥3:1 contrast ratio
- [ ] Don't rely on color alone (use icons/text)

**Check CSS variables**:
- `--text`: Verify against background
- `--text-mute`: Often fails contrast checks
- Button colors: Mint, primary, secondary

#### 2. Keyboard Navigation
- [ ] Tab through entire site (no traps)
- [ ] Focus indicators visible on all interactive elements
- [ ] Skip-to-content link at top of page
- [ ] Modals trap focus properly (Escape to close)

**Files needing focus styles**:
- `ConnectWalletModal.tsx` - Wallet buttons
- `app/airdrop/page.tsx` - Share buttons
- Form inputs in `/register`

#### 3. Screen Reader Support
- [ ] All images have descriptive alt text (not "image1.png")
- [ ] Form labels linked to inputs (`htmlFor`)
- [ ] ARIA labels for icon-only buttons
- [ ] Proper semantic HTML (`<button>` not `<div>`)
- [ ] Announce dynamic updates with ARIA live regions

**Examples**:
```jsx
// ✅ Good
<button aria-label="Copy referral link">
  <Icon name="copy" />
</button>

// ❌ Bad
<div onClick={copy} style={{ cursor: 'pointer' }}>
  📋
</div>
```

#### 4. Reduced Motion
- [ ] Respect `prefers-reduced-motion` media query
- [ ] Test with browser accessibility settings enabled

---

### D. Cross-Browser & Device Testing

#### 1. Browsers to Test
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari (iOS 14+)
- [ ] Chrome Mobile (Android)

#### 2. Testing Tools
- [ ] Chrome DevTools (Lighthouse, Mobile View)
- [ ] Firefox DevTools (Responsive Design)
- [ ] BrowserStack (cross-browser testing)
- [ ] Real device testing (iPhone, Android)

#### 3. Common Issues to Check
- [ ] Webkit prefix styles (border-radius, transform)
- [ ] Flexbox alignment (older Safari versions)
- [ ] CSS Grid support
- [ ] SVG rendering
- [ ] WebP image fallbacks
- [ ] Smooth scrolling behavior
- [ ] Viewport units (vh, vw)

---

### E. User Experience Enhancements

#### 1. Loading States
- [ ] Every async operation shows loading spinner
- [ ] Skeleton screens for initial page load
- [ ] "Loading..." text with animated dots
- [ ] Disable buttons while loading

**Locations**:
```
- Wallet connection modal
- Dashboard data fetch
- Referral link copy
- Custom code submission
- OAuth popup monitoring
```

#### 2. Error Handling
- [ ] User-friendly error messages (no stack traces)
- [ ] Retry buttons for failed operations
- [ ] Error boundary component for crashes
- [ ] Fallback UI when API is down

**Example improvements**:
```jsx
// Current: "Failed to resolve ref code"
// Better: "Couldn't verify the referral code. Try again or use the dashboard."
```

#### 3. Empty States
- [ ] Dashboard when no positions
- [ ] Leaderboard when loading
- [ ] Badges section when not earned
- [ ] Referral section when no link yet

#### 4. Toast/Alert Notifications
- [ ] Auto-dismiss after 4-5 seconds
- [ ] Stack multiple toasts (don't overlap)
- [ ] Different colors for success/error/info
- [ ] Dismissible with X button
- [ ] Accessible via ARIA live regions

#### 5. Form Validation
- [ ] Real-time feedback (not just on submit)
- [ ] Clear error messages
- [ ] Success states (green checkmarks)
- [ ] Input masking where helpful
- [ ] Disable submit until valid

---

### F. Performance Metrics

#### Lighthouse Targets
- [ ] Performance: ≥90
- [ ] Accessibility: ≥90
- [ ] Best Practices: ≥90
- [ ] SEO: ≥90

**Run Lighthouse**:
1. Vercel → Project → Analytics
2. Chrome DevTools → Lighthouse tab
3. Or: `npm install -g lighthouse && lighthouse https://airdrop.shiftrwa.xyz`

#### Core Web Vitals
- [ ] LCP (Largest Contentful Paint): <2.5s
- [ ] FID (First Input Delay): <100ms
- [ ] CLS (Cumulative Layout Shift): <0.1

**Monitor in Vercel Dashboard**:
- Real User Monitoring (RUM) data
- Device breakdowns
- Geo distribution

---

### G. Content & Copy

#### 1. Clarity
- [ ] All CTA buttons have clear action text
- [ ] Error messages explain the problem AND solution
- [ ] Tooltips on hover for complex features

**Examples**:
```
❌ "Error"
✅ "Wallet connection failed. Ensure MetaMask is installed and try again."

❌ "Click here"
✅ "Go to Quests on SNAG"
```

#### 2. Consistency
- [ ] Button labels consistent across pages
- [ ] Use same terminology (Loyalty Points, XP, Multiplier)
- [ ] Date/number formatting consistent
- [ ] Color coding consistent (e.g., mint = bonus)

#### 3. Internationalization (Future)
- [ ] Setup i18n framework (next-i18next)
- [ ] Extract all hardcoded strings to messages
- [ ] Plan for RTL support (Arabic, Hebrew)

---

### H. Security & Privacy

#### 1. Sensitive Data
- [ ] Never log wallet addresses to console
- [ ] No API keys in frontend code
- [ ] Sanitize user input in modals
- [ ] CORS configured correctly on backend

#### 2. Wallet Security
- [ ] Confirm transactions clearly before signing
- [ ] Show which wallet is connected (address truncated)
- [ ] Disconnect option always visible
- [ ] Warn before switching networks

#### 3. Privacy
- [ ] Privacy policy link in footer
- [ ] Cookie consent banner (if needed)
- [ ] Explain data collection in modals

---

### I. Testing Checklist

#### 1. Functional Testing
- [ ] Referral link `/r/[code]` redirects correctly
- [ ] Wallet connections (MetaMask, Solana, Trust Wallet)
- [ ] OAuth flows (Discord, Twitter, Telegram)
- [ ] Custom referral code creation
- [ ] Bonus multiplier displays and countdown
- [ ] Share buttons open correct URLs

#### 2. Scenario Testing
- [ ] First-time user (no wallet → register → airdrop dashboard)
- [ ] Returning user (wallet connected → sees dashboard)
- [ ] Referral user (`/register?ref=CODE` → sees bonus banner)
- [ ] No positions (shows empty state)
- [ ] Network error (API down → shows error + retry)
- [ ] Mobile user (all features work on 375px width)

#### 3. Edge Cases
- [ ] Very long wallet addresses
- [ ] Special characters in custom referral codes
- [ ] Rapid button clicks (prevent double submission)
- [ ] Page refresh during loading
- [ ] Browser back button behavior
- [ ] Local storage corruption (clear and reload)

---

### J. Analytics & Monitoring

#### 1. PostHog Setup (Already Configured)
- [ ] Track page views
- [ ] Track button clicks (Copy, Share, Connect Wallet)
- [ ] Track errors and API failures
- [ ] Set user identifiers (wallet address)

#### 2. Sentry/Error Tracking (Recommended)
```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
import * as Sentry from "@sentry/nextjs";

export default Sentry.withSentryConfig(nextConfig, {
  org: "shift-rwa",
  project: "frontend",
});
```

#### 3. Performance Monitoring
- [ ] Track API response times
- [ ] Monitor wallet connection latency
- [ ] Alert on >3s page load times
- [ ] Track referral conversion rates

---

## 🔄 Pre-Launch Checklist

### Before Going Live

- [ ] All environment variables set in Vercel
- [ ] Custom domain (airdrop.shiftrwa.xyz) configured
- [ ] SSL certificate active
- [ ] Redirect from old domain if applicable
- [ ] Backend API URL verified
- [ ] SNAG loyalty page accessible
- [ ] All 3 OAuth flows tested end-to-end
- [ ] Lighthouse score ≥85 on all metrics
- [ ] Mobile tested on real devices
- [ ] Keyboard navigation works fully
- [ ] All error states tested
- [ ] Load testing with >100 concurrent users
- [ ] Spam protection on form submissions
- [ ] Rate limiting on API calls
- [ ] Database backups configured
- [ ] Monitoring alerts set up

### Day-1 Monitoring

- [ ] Watch error tracking (Sentry/PostHog)
- [ ] Monitor API response times
- [ ] Check Vercel logs for build issues
- [ ] Monitor Lighthouse scores daily
- [ ] Track user feedback on Discord/Twitter
- [ ] Be ready to hotfix critical bugs

---

## 📋 Implementation Order

1. **Critical** (Required for launch):
   - [ ] Set environment variables in Vercel
   - [ ] Test referral redirect `/r/[code]`
   - [ ] Test wallet connections
   - [ ] Mobile responsive testing

2. **High Priority** (Before GA):
   - [ ] Accessibility improvements (focus states, contrast)
   - [ ] Error handling & messages
   - [ ] Loading states
   - [ ] Lighthouse score ≥85

3. **Medium Priority** (Post-launch improvements):
   - [ ] Advanced analytics
   - [ ] Performance monitoring
   - [ ] Form validation enhancements
   - [ ] Toast notifications refinement

4. **Low Priority** (Polish):
   - [ ] Animations/transitions
   - [ ] Dark mode
   - [ ] Internationalization
   - [ ] Advanced filtering/sorting

---

## 🆘 Troubleshooting

### Environment Variables Not Loading
**Issue**: `process.env.NEXT_PUBLIC_*` shows undefined
**Solution**:
1. Verify variable exists in Vercel dashboard
2. Rebuild deployment (force redeploy)
3. Check variable name matches exactly (case-sensitive)

### Referral Link Not Redirecting
**Issue**: `/r/[code]` returns 404
**Solution**:
1. Verify `frontend/app/r/[code]/page.tsx` exists
2. Check build output includes `ƒ /r/[code]` route
3. Clear browser cache and hard refresh
4. Check redirect URL is correct in page.tsx

### Wallet Buttons Not Working
**Issue**: MetaMask/Solana buttons don't connect
**Solution**:
1. Check wallet extensions installed
2. Allow popup notifications in browser
3. Check network (Solana/EVM mismatch)
4. Review console for error messages

### Mobile Layout Broken
**Issue**: Content overlaps or misaligned on mobile
**Solution**:
1. Check CSS media queries (max-width: 768px)
2. Verify flex/grid responsive settings
3. Test in Chrome DevTools device mode
4. Check touch target sizes (min 48x48px)

---

## 📞 Support

For deployment issues:
- Check Vercel build logs: Project → Deployments → Select deployment → Logs
- Review Next.js docs: https://nextjs.org/docs
- Check environment variable format in Vercel

For UI issues:
- Chrome DevTools: F12 → Responsive Design Mode
- Lighthouse: F12 → Lighthouse tab
- React DevTools browser extension for debugging
