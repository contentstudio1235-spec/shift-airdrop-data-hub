// ============================================================
// Database Migration Runner — Node.js version
// ============================================================

import fs from 'fs';
import path from 'path';
import { pool, execute } from './pool';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface Migration {
  name: string;
  path: string;
  content: string;
}

/**
 * Read all migration files from the migrations directory.
 */
function getMigrations(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Execute in order: 001, 002, 003, etc.

  return files.map(file => ({
    name: file,
    path: path.join(MIGRATIONS_DIR, file),
    content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8'),
  }));
}

/**
 * Execute a single migration.
 */
async function executeMigration(migration: Migration): Promise<void> {
  console.log(`\n📝 Running migration: ${migration.name}`);

  try {
    // Split by semicolon and execute each statement
    const statements = migration.content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.length > 0) {
        await execute(statement);
      }
    }

    console.log(`✅ Migration ${migration.name} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Migration ${migration.name} failed:`, error.message);
    throw error;
  }
}

/**
 * Run all pending migrations.
 */
export async function runMigrations(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🗄️  Database Migration Runner');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Ensure migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
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
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ Migration failed');
    console.error('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

/**
 * CLI entry point for running migrations manually.
 */
async function main(): Promise<void> {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
