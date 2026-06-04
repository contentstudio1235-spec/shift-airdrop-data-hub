// src/services/whaleStreamService.ts
import { query } from '../db/pool';
import type { WhaleEvent } from '../types/whale';

const SNAG_PATTERN = /^[a-zA-Z0-9]{6}$/;

function classifySource(firstUtm: string | null, referredBy: string | null): string {
  const utm = firstUtm && firstUtm.length > 0 && firstUtm !== 'unknown_legacy' ? firstUtm.toLowerCase() : null;
  if (utm && SNAG_PATTERN.test(utm)) return 'snag_referrals';
  if (referredBy && SNAG_PATTERN.test(referredBy)) return 'snag_referrals';
  return utm ?? referredBy ?? 'direct';
}

function truncateWallet(w: string): string {
  if (w.length <= 12) return w;
  return `${w.slice(0, 8)}...${w.slice(-4)}`;
}

// Per Code Reviewer sprint-3-code-review.md BLOCKER 2: only OPEN positions
// belong in the whale event stream. Closed positions ≥ $1k must NOT surface
// (they aren't new opens — and rowToEvent hardcodes type:'open').
const WHALE_SQL = `
  SELECT pos.wallet,
         p.first_utm_source AS first_utm,
         u.referred_by_code AS ref,
         pos.asset,
         pos.position_size_usd::text AS size,
         pos.opened_at
  FROM positions pos
  LEFT JOIN users u ON u.wallet = pos.wallet
  LEFT JOIN user_profiles p ON p.primary_wallet = pos.wallet AND p.merged_into_profile_id IS NULL
  WHERE pos.position_size_usd >= 1000
    AND pos.status = 'open'
`;

interface Row { wallet: string; first_utm: string | null; ref: string | null; asset: string; size: string; opened_at: string; }

function rowToEvent(r: Row, isHistorical: boolean): WhaleEvent {
  return {
    type: 'open',
    wallet: r.wallet,
    walletDisplay: truncateWallet(r.wallet),
    source: classifySource(r.first_utm, r.ref),
    asset: r.asset,
    sizeUSD: Number(r.size),
    openedAt: r.opened_at,
    ...(isHistorical ? { isHistorical: true } : {}),
  };
}

export async function fetchInitialWhales(limit = 20): Promise<WhaleEvent[]> {
  const rows = await query<Row>(`${WHALE_SQL} ORDER BY pos.opened_at DESC LIMIT $1`, [limit]);
  return rows.map(r => rowToEvent(r, true));
}

export async function pollNewWhales(since: Date): Promise<WhaleEvent[]> {
  const rows = await query<Row>(`${WHALE_SQL} AND pos.opened_at > $1 ORDER BY pos.opened_at ASC LIMIT 50`, [since.toISOString()]);
  return rows.map(r => rowToEvent(r, false));
}
