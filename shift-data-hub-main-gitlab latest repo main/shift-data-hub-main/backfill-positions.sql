-- Backfill positions with correct USD values
-- These positions were created with $0 due to Helius webhook handler issue

-- 1. deeweb3grul (5hv5DaEnKCZgxbKX55YS8ez16V2P5LwZjYwrKBZHNppt) - SOX3S - 1.79 USDC
UPDATE positions
SET position_size_usd = 1.79
WHERE wallet = '5hv5DaEnKCZgxbKX55YS8ez16V2P5LwZjYwrKBZHNppt' 
  AND asset = 'SOX3S'
  AND status = 'open'
  AND position_size_usd = 0
  AND opened_at BETWEEN '2026-05-29 11:30:00'::timestamp AND '2026-05-29 11:40:00'::timestamp;

-- 2. promisecase (2ADhLm8mvjVwuMozVkPr8b3GwWuob636AnWsGcSCFAxy) - TSL1S - 1.56 USDC
UPDATE positions
SET position_size_usd = 1.56
WHERE wallet = '2ADhLm8mvjVwuMozVkPr8b3GwWuob636AnWsGcSCFAxy'
  AND asset = 'TSL1S'
  AND status = 'open'
  AND position_size_usd = 0
  AND opened_at BETWEEN '2026-05-29 12:15:00'::timestamp AND '2026-05-29 12:20:00'::timestamp;

-- 3. Unknown wallet (CNQEVQsUbCkkJGENSuE5GxNmyvwBYDS4Py8TSALuEyZo) - SOX3S - 1.68 USDC
UPDATE positions
SET position_size_usd = 1.68
WHERE wallet = 'CNQEVQsUbCkkJGENSuE5GxNmyvwBYDS4Py8TSALuEyZo'
  AND asset = 'SOX3S'
  AND status = 'open'
  AND position_size_usd = 0
  AND opened_at BETWEEN '2026-05-29 11:55:00'::timestamp AND '2026-05-29 12:00:00'::timestamp;

-- Verify the updates
SELECT wallet, asset, position_size_usd, opened_at, status
FROM positions
WHERE wallet IN (
  '5hv5DaEnKCZgxbKX55YS8ez16V2P5LwZjYwrKBZHNppt',
  '2ADhLm8mvjVwuMozVkPr8b3GwWuob636AnWsGcSCFAxy',
  'CNQEVQsUbCkkJGENSuE5GxNmyvwBYDS4Py8TSALuEyZo'
)
ORDER BY opened_at DESC;
