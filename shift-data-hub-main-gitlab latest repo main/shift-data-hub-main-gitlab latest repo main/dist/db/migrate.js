"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
/**
 * Run base schema and all migrations.
 * This is the main entry point for database setup.
 */
async function migrate() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     SHIFT Airdrop — Database Migration Runner            ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    try {
        // Step 1: Apply base schema
        console.log('📝 Step 1: Applying base schema...\n');
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        if (!fs_1.default.existsSync(schemaPath)) {
            console.error('❌ schema.sql not found at', schemaPath);
            process.exit(1);
        }
        const schema = fs_1.default.readFileSync(schemaPath, 'utf-8');
        const schemaStatements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        for (const statement of schemaStatements) {
            await (0, pool_1.execute)(statement);
        }
        console.log('✅ Base schema applied successfully\n');
        // Step 2: Run migrations
        console.log('📝 Step 2: Running migrations...\n');
        const migrationsDir = path_1.default.join(__dirname, 'migrations');
        if (!fs_1.default.existsSync(migrationsDir)) {
            console.warn('⚠️  Migrations directory not found (this is OK on first setup)');
        }
        else {
            const migrationFiles = fs_1.default.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .sort();
            if (migrationFiles.length === 0) {
                console.log('ℹ️  No migrations to run\n');
            }
            else {
                console.log(`Found ${migrationFiles.length} migration(s):\n`);
                for (const file of migrationFiles) {
                    console.log(`  🔄 ${file}...`);
                    const migrationPath = path_1.default.join(migrationsDir, file);
                    const migrationContent = fs_1.default.readFileSync(migrationPath, 'utf-8');
                    const statements = migrationContent
                        .split(';')
                        .map(stmt => stmt.trim())
                        .filter(stmt => stmt.length > 0);
                    for (const statement of statements) {
                        await (0, pool_1.execute)(statement);
                    }
                    console.log(`  ✅ ${file} completed\n`);
                }
            }
        }
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║             ✅ All migrations completed!                 ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
    }
    catch (error) {
        console.error('\n╔══════════════════════════════════════════════════════════╗');
        console.error('║               ❌ Migration failed                        ║');
        console.error('╚══════════════════════════════════════════════════════════╝\n');
        console.error('Error:', error.message);
        process.exit(1);
    }
    await pool_1.pool.end();
    process.exit(0);
}
// Run migration
migrate().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map