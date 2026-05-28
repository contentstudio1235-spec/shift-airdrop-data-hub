# Fix Loyalty Page Embedding - 3 Solutions

**Problem**: `https://loyalty.shiftrwa.xyz/loyalty` is blocking iframe embedding  
**Cause**: X-Frame-Options header set to DENY or SAMEORIGIN  
**URL**: https://airdrop.shiftrwa.xyz/loyalty

---

## SOLUTION 1: Server-Side Proxy (RECOMMENDED)
**Best For**: Maximum control, no CORS issues, works with any external site

### How It Works:
- Create Next.js API route that fetches loyalty page content
- Return content to frontend with proper headers
- Display in an iframe or directly in page

### Implementation:

**Step 1: Create API route** (`frontend/app/api/loyalty/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('https://loyalty.shiftrwa.xyz/loyalty', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const html = await response.text();

    // Allow embedding in our domain
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'Access-Control-Allow-Origin': 'https://airdrop.shiftrwa.xyz',
      },
    });
  } catch (error) {
    console.error('[Loyalty Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load loyalty page' },
      { status: 500 }
    );
  }
}
```

**Step 2: Update loyalty page** (`frontend/app/loyalty/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function LoyaltyPage() {
  const [iframeHeight, setIframeHeight] = useState('100vh');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'resize') {
        setIframeHeight(`${event.data.height}px`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="page fade-in" style={{ padding: 0, maxWidth: '100%', margin: 0 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px' }}>
        <h1 style={{
          fontSize: 44,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
          lineHeight: 1.1,
        }}>
          Loyalty & Rewards
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-dim)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          Complete social tasks and earn XP. Connect your socials to unlock multiplier bonuses.
        </p>
      </div>

      {/* Embedded Loyalty Page via Proxy */}
      <div style={{
        width: '100%',
        border: 'none',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--card)',
        marginBottom: 48,
      }}>
        <iframe
          src="/api/loyalty"
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            borderRadius: 12,
            display: 'block',
          }}
          title="SHIFT Loyalty & Rewards"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation"
        />
      </div>
    </div>
  );
}
```

**Pros:**
- ✅ Works with any external site
- ✅ No CORS issues
- ✅ Can modify/cache content if needed
- ✅ SEO-friendly for your domain

**Cons:**
- Requires backend proxy
- Slight latency (network hop)

---

## SOLUTION 2: Update External Domain Headers (IF YOU CONTROL IT)
**Best For**: If you control loyalty.shiftrwa.xyz

If loyalty.shiftrwa.xyz is your domain, add these headers:

### Nginx Configuration:
```nginx
location /loyalty {
  add_header X-Frame-Options "ALLOW-FROM https://airdrop.shiftrwa.xyz" always;
  add_header Content-Security-Policy "frame-ancestors https://airdrop.shiftrwa.xyz https://loyalty.shiftrwa.xyz" always;
}
```

### Express.js Configuration:
```javascript
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'ALLOW-FROM https://airdrop.shiftrwa.xyz');
  res.header('Content-Security-Policy', 'frame-ancestors https://airdrop.shiftrwa.xyz https://loyalty.shiftrwa.xyz');
  next();
});
```

### Next.js Configuration (next.config.js):
```javascript
module.exports = {
  headers: async () => [
    {
      source: '/loyalty',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'ALLOW-FROM https://airdrop.shiftrwa.xyz'
        },
        {
          key: 'Content-Security-Policy',
          value: 'frame-ancestors https://airdrop.shiftrwa.xyz https://loyalty.shiftrwa.xyz'
        }
      ]
    }
  ]
};
```

**Pros:**
- ✅ Most efficient
- ✅ No proxy overhead
- ✅ Direct communication

**Cons:**
- Only works if you control the domain

---

## SOLUTION 3: Redirect with Styled Container (FALLBACK)
**Best For**: Quick fix while permanent solution is implemented

Update loyalty page to show external link with nice UI:

```typescript
'use client';

import Link from 'next/link';

export default function LoyaltyPage() {
  return (
    <div className="page fade-in" style={{ padding: 0, maxWidth: '100%', margin: 0 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px' }}>
        <h1 style={{
          fontSize: 44,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
          lineHeight: 1.1,
        }}>
          Loyalty & Rewards
        </h1>
      </div>

      {/* Notice + Button */}
      <div style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: 'var(--card)',
        borderRadius: 12,
        marginBottom: 48,
      }}>
        <div style={{ fontSize: 18, color: 'var(--text-dim)', marginBottom: 20 }}>
          Opening Loyalty program in a new window...
        </div>
        
        <a
          href="https://loyalty.shiftrwa.xyz/loyalty"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: 'var(--mint)',
            color: '#000',
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: 16,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1.05)';
            (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,212,170,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        >
          Open Loyalty Program ↗
        </a>

        <p style={{ color: 'var(--text-mute)', marginTop: 16, fontSize: 14 }}>
          If it doesn't open, click the button above
        </p>
      </div>
    </div>
  );
}
```

**Pros:**
- ✅ Works immediately
- ✅ No configuration needed
- ✅ Simple to implement

**Cons:**
- ❌ Opens in new window (not embedded)
- ❌ Leaves your site

---

## MY RECOMMENDATION

### Priority Order:

**1. BEST: Solution 1 (Server Proxy)**
   - Works 100% reliably
   - No external domain changes needed
   - Professional embedded experience
   - ~15 min to implement

**2. GOOD: Solution 2 (Domain Headers)**
   - If you control both domains
   - More efficient than proxy
   - Add these headers to loyalty.shiftrwa.xyz
   - ~5 min to implement

**3. FALLBACK: Solution 3 (Redirect)**
   - Temporary while fixing permanent solution
   - Users leave your site (not ideal)
   - Good for testing

---

## IMPLEMENTATION CHECKLIST

### If Using Solution 1 (Recommended):

- [ ] Create `/frontend/app/api/loyalty/route.ts`
- [ ] Add proxy fetch function
- [ ] Update `/frontend/app/loyalty/page.tsx` to use `/api/loyalty`
- [ ] Test iframe loads content
- [ ] Verify all external links work
- [ ] Check console for errors
- [ ] Test on mobile
- [ ] Build & deploy

### If Using Solution 2:

- [ ] Update loyalty.shiftrwa.xyz web server config
- [ ] Add X-Frame-Options header
- [ ] Add Content-Security-Policy header
- [ ] Test iframe loads
- [ ] Clear browser cache & test again

### If Using Solution 3:

- [ ] Replace iframe with redirect link
- [ ] Style button nicely
- [ ] Test click opens in new window

---

## NEXT STEPS

**Immediate (Today):**
1. Which solution do you want to use?
2. Do you control loyalty.shiftrwa.xyz or is it external?
3. I can implement the chosen solution in ~30 minutes

**Testing:**
- Visit https://airdrop.shiftrwa.xyz/loyalty
- Should see loyalty content loaded
- Test on mobile & desktop
- Check browser console for errors

**Deployment:**
- Push to GitHub
- Deploy to Vercel
- Verify on production

---

## TROUBLESHOOTING

**If iframe still shows loading:**
```
1. Check browser console for CORS errors
2. Verify loyalty.shiftrwa.xyz is accessible
3. Check X-Frame-Options header: curl -sI https://loyalty.shiftrwa.xyz/loyalty | grep X-Frame
4. Try Solution 1 (proxy) as fallback
```

**If content doesn't render:**
```
1. Check iframe sandbox attributes
2. Verify external domain CSS/JS loads
3. Check for CSP (Content-Security-Policy) conflicts
4. Use browser DevTools → Network tab to see requests
```

---

Let me know which solution you want to use and I'll implement it right away! 🚀

