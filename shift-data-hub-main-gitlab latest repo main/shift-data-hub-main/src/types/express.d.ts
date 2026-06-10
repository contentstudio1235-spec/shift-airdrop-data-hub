// ============================================================
// Express type augmentation — Request extensions for UTM capture
// ============================================================
// The utmCapture() middleware stashes the normalized UTM payload on
// req.utmNormalized so downstream handlers (register, etc.) can read it
// without re-parsing query params.
//
// Loaded via tsconfig's `src/**/*` include.
// ============================================================

import type { NormalizedUtm } from '../services/utmService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by utmCapture middleware when at least one utm_* param is present. */
      utmNormalized?: NormalizedUtm;
    }
  }
}

export {};
