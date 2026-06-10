"use strict";
// ============================================================
// Database Migration Runner — Node.js version
// ============================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
const MIGRATIONS_DIR = path_1.default.join(__dirname, 'migrations');
function getMigrations() {
    const files = fs_1.default.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();
    return files.map(file => ({
        name: file,
        path: path_1.default.join(MIGRATIONS_DIR, file),
        content: fs_1.default.readFileSync(path_1.default.join(MIGRATIONS_DIR, file), 'utf-8'),
    }));
}
// Create the tracking table if it doesn't exist, return the set of already-applied filenames.
async function ensureTrackingTable() {
    const client = await pool_1.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
        const { rows } = await client.query('SELECT filename FROM schema_migrations');
        return new Set(rows.map((r) => r.filename));
    }
    finally {
        client.release();
    }
}
async function markApplied(filename) {
    const client = await pool_1.pool.connect();
    try {
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [filename]);
    }
    finally {
        client.release();
    }
}
async function executeMigration(migration) {
    console.log(`\n📝 Running migration: ${migration.name}`);
    // Run the WHOLE file as a single script on one connection. We deliberately
    // do NOT split on ';' — that naive split breaks on semicolons inside
    // comments, single-quoted strings, and dollar-quoted bodies (DO $$ ... $$).
    // Postgres' simple-query protocol parses the multi-statement script itself.
    const client = await pool_1.pool.connect();
    try {
        await client.query(migration.content);
        console.log(`✅ Migration ${migration.name} completed successfully`);
    }
    catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error.message);
        throw error;
    }
    finally {
        client.release();
    }
}
async function runMigrations() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🗄️  Database Migration Runner');
    console.log('═══════════════════════════════════════════════════════════\n');
    try {
        if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
            console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
            process.exit(1);
        }
        const migrations = getMigrations();
        if (migrations.length === 0) {
            console.log('ℹ️  No migrations found');
            return;
        }
        const applied = await ensureTrackingTable();
        const pending = migrations.filter(m => !applied.has(m.name));
        const skipped = migrations.length - pending.length;
        console.log(`Found ${migrations.length} migration(s) — ${skipped} already applied, ${pending.length} pending:\n`);
        migrations.forEach(m => {
            const status = applied.has(m.name) ? '  ✓' : '  •';
            console.log(`${status} ${m.name}`);
        });
        console.log('\n');
        if (pending.length === 0) {
            console.log('ℹ️  All migrations already applied — nothing to do');
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log('✅ Migrations up to date');
            console.log('═══════════════════════════════════════════════════════════\n');
            return;
        }
        for (const migration of pending) {
            await executeMigration(migration);
            await markApplied(migration.name);
        }
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ All migrations completed successfully!');
        console.log('═══════════════════════════════════════════════════════════\n');
    }
    catch (error) {
        console.error('\n═══════════════════════════════════════════════════════════');
        console.error('❌ Migration failed');
        console.error('═══════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}
async function main() {
    try {
        await runMigrations();
        process.exit(0);
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=migrationRunner.js.map