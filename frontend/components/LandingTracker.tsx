"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackLanding } from '@/lib/tracking';

/**
 * Mounts once in the root layout. Fires trackLanding on first mount AND on
 * every SPA route change. The 250ms delay lets the GA4 gtag script set the
 * _ga cookie on first paint before we read it.
 */
export function LandingTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const id = setTimeout(() => {
      void trackLanding(pathname);
    }, 250);
    return () => clearTimeout(id);
  }, [pathname]);

  return null;
}
