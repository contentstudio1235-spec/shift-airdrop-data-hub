-- Wallet 1: CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS
SELECT 
  w.wallet,
  w.total_sp,
  w.position_sp,
  w.social_sp,
  COUNT(CASE WHEN p.status = 'open' THEN 1 END) as open_positions,
  COUNT(CASE WHEN p.status = 'closed' THEN 1 END) as closed_positions,
  MAX(CASE WHEN p.status = 'open' THEN p.created_at END) as last_open_position_time
FROM users w
LEFT JOIN positions p ON w.wallet = p.wallet
WHERE w.wallet = 'CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS'
GROUP BY w.wallet, w.total_sp, w.position_sp, w.social_sp;

-- Wallet 2: Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ
SELECT 
  w.wallet,
  w.total_sp,
  w.position_sp,
  w.social_sp,
  COUNT(CASE WHEN p.status = 'open' THEN 1 END) as open_positions,
  COUNT(CASE WHEN p.status = 'closed' THEN 1 END) as closed_positions,
  MAX(CASE WHEN p.status = 'open' THEN p.created_at END) as last_open_position_time
FROM users w
LEFT JOIN positions p ON w.wallet = p.wallet
WHERE w.wallet = 'Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ'
GROUP BY w.wallet, w.total_sp, w.position_sp, w.social_sp;

-- Check positions for wallet 1
SELECT 
  id,
  asset,
  position_size_usd,
  weeks_held,
  base_multiplier,
  current_multiplier,
  status,
  created_at,
  closed_at
FROM positions
WHERE wallet = 'CSwviABKjDF4YvpC2UJ7M7Rvpwq4AYERkP3sPT8zJnoS'
ORDER BY created_at DESC;

-- Check positions for wallet 2
SELECT 
  id,
  asset,
  position_size_usd,
  weeks_held,
  base_multiplier,
  current_multiplier,
  status,
  created_at,
  closed_at
FROM positions
WHERE wallet = 'Bg3SN2Qgmgt9d9FohkFG4fbQGBNgjkQ2hyJd9JX6hqXZ'
ORDER BY created_at DESC;
