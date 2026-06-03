# Next.js 16.2.2 — Notes for Funnel Platform Work

> Source: Context7 MCP — `/vercel/next.js/v16.2.2`, queried 2026-06-02.
> Per `frontend/AGENTS.md`: "This is NOT the Next.js you know."

This is a 1-pager of the Next.js 16 conventions that affect the funnel/attribution platform work. Read this **before** writing any frontend code in Sprint 0–3.

## Conventions Our Frontend Code Must Follow

### 1. `"use client"` Directive — Mandatory for Hook-Using Components

Every file in `frontend/components/DataHub/`, `frontend/hooks/`, `frontend/app/admin/data-hub/views/`, and `frontend/app/admin/data-hub/layout-shell.tsx` that uses React hooks **must** start with:

```typescript
"use client";
```

This is non-negotiable in 16.x. Server components are the default. The existing `page.tsx` already does this — follow that pattern.

### 2. Navigation Hooks — Import from `next/navigation`

```typescript
"use client";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
```

**Do NOT** import from `next/router` (that's the old Pages Router; removed in 16). The plan's `useFilters.ts` hook already uses the correct imports.

### 3. `useSearchParams()` Returns Readonly

`useSearchParams()` returns `ReadonlyURLSearchParams`. To build a new URL with mutated params, construct a fresh `URLSearchParams` instance — do not mutate the one returned by the hook. The plan's `useFilters.ts` already does this via `paramsToFilters()` → `filtersToParams()`.

### 4. `router.replace()` for URL Sync Without Scroll

To update URL params without scrolling:

```typescript
router.replace(`?${searchParams.toString()}`, { scroll: false });
```

The `scroll: false` option is critical for filter-bar UX (otherwise the page jumps to top on every filter change).

### 5. Dynamic Route Params Are Promises (Not Applicable Here, But Be Aware)

In 16.x, dynamic route `params` are a `Promise` that must be awaited:

```typescript
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}
```

**Affects our work?** No — we don't add any new dynamic routes in this feature. The existing `/admin/data-hub/page.tsx` is a static route. But if Sprint 2 adds drill-down routes like `/admin/data-hub/whales/[wallet]`, follow this pattern.

### 6. Route Handlers Are in `app/api/.../route.ts` (Not Applicable Here)

Next.js 16 route handlers live in `app/api/<path>/route.ts`. We are **not** adding any — the SSE stream and funnel endpoints all live on the Express backend (`Shift-Airdrop-Backend/src/routes/*.ts`). The frontend only calls them via `apiGet()` from `frontend/lib/api.ts`.

### 7. Server Components Are the Default

Anything NOT marked `"use client"` runs on the server. Our hub uses `"use client"` everywhere because:
- We need React state (auth, filters, fetched data)
- We use browser APIs (`localStorage`, `EventSource`)
- We have interactive UI (clicks, drill-downs)

Don't try to "optimize" by converting a component to server — it won't work with our state model.

## Patterns to Avoid (Carry-Overs from Old Next.js Versions)

| Don't do this | Do this instead |
|---|---|
| `import { useRouter } from 'next/router'` | `import { useRouter } from 'next/navigation'` |
| `router.query` | `useSearchParams()` |
| `getServerSideProps` / `getStaticProps` | Async server components with `await fetch(...)` |
| `next/head` | `<head>` in layout or metadata API |
| Mutating `searchParams` | Build a new `URLSearchParams` |
| `router.push(url, as, options)` | `router.push(url, { scroll, locale })` (2-arg form) |

## SSE Subscription Pattern (for the Whale Watch ticker, Sprint 2)

Browser `EventSource` works the same as before. The new pattern is just where the SSE server lives:

```typescript
"use client";
import { useEffect, useRef } from 'react';
import { sseURL } from '@/lib/api';

export function useWhaleStream(onEvent: (e: WhaleStreamEvent) => void) {
  const ref = useRef<EventSource | null>(null);
  useEffect(() => {
    const es = new EventSource(sseURL('/api/stream/whales'));
    es.onmessage = (msg) => {
      try { onEvent(JSON.parse(msg.data)); } catch { /* skip */ }
    };
    es.onerror = () => { /* auto-reconnect handled by browser */ };
    ref.current = es;
    return () => { es.close(); };
  }, [onEvent]);
}
```

The `sseURL()` helper in `frontend/lib/api.ts` injects the admin key as a query param because `EventSource` cannot set headers — that's a browser limitation, not a Next.js one.

## Turbopack Notes

The project uses `npx next dev` (Turbopack) and `npx next build`. Two practical impacts:

1. **Module resolution is stricter.** Use `@/` paths only when `tsconfig.json` has them aliased (it does — see `paths`). Don't use deep relative paths like `../../../components/foo`.
2. **Hot reload is faster but more aggressive.** A bad `useEffect` dependency array can spin the dev server. Audit deps carefully.

## Build Verification Pattern

After any frontend change, run:

```bash
cd "/Users/tomer/Library/Mobile Documents/com~apple~CloudDocs/Claude/Projects/SHIFT Airdrop/Shift-Airdrop-Backend/frontend"
npx next build 2>&1 | tail -30
```

A clean build is required before committing per CLAUDE.md ("Always `npx next build` locally before Vercel deploy"). Type errors here are blocking.

## Reference Source

All facts above sourced from Context7 MCP queries against `/vercel/next.js/v16.2.2`. Verify against `frontend/node_modules/next/dist/docs/` if any line looks wrong in practice.

---

*Last updated: 2026-06-02 — for Sprint 0 of funnel-attribution-platform branch.*
