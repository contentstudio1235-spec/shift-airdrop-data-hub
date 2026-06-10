INSERT INTO positions (wallet, asset, asset_mint, position_size_usd, opened_at, status, xp_generated, last_xp_calc, created_at)
VALUES ('3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn', 'SOX3L', 'Hyhxfb6riaqCV333GynmnCXCEQK3goTznFj7k4dSHFT', 5.00, NOW() - INTERVAL '2 days', 'open', 0, NOW(), NOW());

SELECT wallet, asset_mint, position_size_usd, opened_at, current_multiplier FROM positions WHERE wallet = '3uDJ7xjCEhWmBGZATFa6R5eWGu2D3drHZCq4peuj31gn';
