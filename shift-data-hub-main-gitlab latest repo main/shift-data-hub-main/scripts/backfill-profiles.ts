import { pool } from '../src/db/pool';

interface BackfillCounts {
  usersScanned: number;
  profilesCreated: number;
  walletLinksCreated: number;
  gaLinksCreated: number;
  snagLinksCreated: number;
  firstUtmBackfilled: number;
  legacyUnknowns: number;
}

async function run(dryRun: boolean): Promise<BackfillCounts> {
  const client = await pool.connect();
  const counts: BackfillCounts = {
    usersScanned: 0,
    profilesCreated: 0,
    walletLinksCreated: 0,
    gaLinksCreated: 0,
    snagLinksCreated: 0,
    firstUtmBackfilled: 0,
    legacyUnknowns: 0,
  };

  try {
    await client.query('BEGIN');

    const r1 = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE user_profile_id IS NULL`,
    );
    counts.usersScanned = Number(r1.rows[0].count);

    if (counts.usersScanned === 0) {
      console.log('No users to backfill.');
      await client.query('ROLLBACK');
      return counts;
    }

    const phaseA = await client.query(
      `
      INSERT INTO user_profiles (primary_wallet, first_seen_at, last_seen_at, created_at, updated_at)
      SELECT wallet, created_at, COALESCE(updated_at, created_at), created_at, COALESCE(updated_at, created_at)
      FROM users WHERE user_profile_id IS NULL
      RETURNING profile_id
      `,
    );
    counts.profilesCreated = phaseA.rowCount ?? 0;

    await client.query(
      `
      UPDATE users u SET user_profile_id = p.profile_id
      FROM user_profiles p
      WHERE u.wallet = p.primary_wallet AND u.user_profile_id IS NULL
      `,
    );

    const phaseB1 = await client.query(
      `
      INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by)
      SELECT u.user_profile_id, 'wallet', u.wallet, 'deterministic', 'backfill_2026_06_03'
      FROM users u
      WHERE u.user_profile_id IS NOT NULL
      ON CONFLICT DO NOTHING
      `,
    );
    counts.walletLinksCreated = phaseB1.rowCount ?? 0;

    const phaseB2 = await client.query(
      `
      INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by)
      SELECT u.user_profile_id, 'ga_client_id', u.ga_user_id, 'deterministic', 'backfill_2026_06_03'
      FROM users u
      WHERE u.user_profile_id IS NOT NULL AND u.ga_user_id IS NOT NULL
      ON CONFLICT DO NOTHING
      `,
    );
    counts.gaLinksCreated = phaseB2.rowCount ?? 0;

    const phaseB3 = await client.query(
      `
      INSERT INTO identity_links (profile_id, identity_type, identity_value, confidence, linked_by)
      SELECT u.user_profile_id, 'snag_user_id', u.snag_user_id, 'deterministic', 'backfill_2026_06_03'
      FROM users u
      WHERE u.user_profile_id IS NOT NULL AND u.snag_user_id IS NOT NULL
      ON CONFLICT DO NOTHING
      `,
    );
    counts.snagLinksCreated = phaseB3.rowCount ?? 0;

    const phaseC = await client.query(
      `
      UPDATE user_profiles p
      SET first_utm_source = LOWER(COALESCE(u.referred_by_code, 'unknown_legacy')),
          attribution_locked_at = NOW()
      FROM users u
      WHERE u.user_profile_id = p.profile_id
        AND p.first_utm_source IS NULL
      `,
    );
    counts.firstUtmBackfilled = phaseC.rowCount ?? 0;

    const r2 = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_profiles WHERE first_utm_source = 'unknown_legacy'`,
    );
    counts.legacyUnknowns = Number(r2.rows[0].count);

    if (dryRun) {
      console.log('--- DRY RUN — rolling back ---');
      console.log(JSON.stringify(counts, null, 2));
      await client.query('ROLLBACK');
      return counts;
    }

    const ck = await client.query<{ hash: string }>(
      `
      SELECT md5(
        COUNT(*)::text || ':' ||
        COALESCE(MIN(profile_id::text), '') || ':' ||
        COALESCE(MAX(profile_id::text), '')
      ) AS hash FROM user_profiles
      `,
    );
    console.log(`Checksum: ${ck.rows[0].hash}`);
    console.log(JSON.stringify(counts, null, 2));

    await client.query('COMMIT');
    return counts;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { /* ignore */ });
    throw err;
  } finally {
    client.release();
  }
}

const dryRun = process.argv.includes('--dry-run');
run(dryRun).then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
