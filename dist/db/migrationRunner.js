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
/**
 * Read all migration files from the migrations directory.
 */
function getMigrations() {
    const files = fs_1.default.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Execute in order: 001, 002, 003, etc.
    return files.map(file => ({
        name: file,
        path: path_1.default.join(MIGRATIONS_DIR, file),
        content: fs_1.default.readFileSync(path_1.default.join(MIGRATIONS_DIR, file), 'utf-8'),
    }));
}
/**
 * Execute a single migration.
 */
async function executeMigration(migration) {
    console.log(`\n📝 Running migration: ${migration.name}`);
    // Run the WHOLE file as a single script on one connection. We deliberately
    // do NOT split on ';' — that naive split breaks on semicolons inside
    // comments, single-quoted strings, and dollar-quoted bodies (DO $$ ... $$).
    // Postgres' simple-query protocol parses the multi-statement script itself
    // and runs it as one implicit transaction (atomic per migration file).
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
/**
 * Run all pending migrations.
 */
async function runMigrations() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🗄️  Database Migration Runner');
    console.log('═══════════════════════════════════════════════════════════\n');
    try {
        // Ensure migrations directory exists
        if (!fs_1.default.existsSync(MIGRATIONS_DIR)) {
            console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
            process.exit(1);
        }
        const migrations = getMigrations();
        if (migrations.length === 0) {
            console.log('ℹ️  No migrations found');
            return;
        }
        console.log(`Found ${migrations.length} migration(s):\n`);
        migrations.forEach(m => console.log(`  • ${m.name}`));
        console.log('\n');
        // Execute each migration
        for (const migration of migrations) {
            await executeMigration(migration);
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
/**
 * CLI entry point for running migrations manually.
 */
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
// Run if called directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=migrationRunner.js.map