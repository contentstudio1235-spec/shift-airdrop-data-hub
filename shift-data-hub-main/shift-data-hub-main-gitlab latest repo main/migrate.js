const fs = require('fs');
const { exec } = require('child_process');

const sql = fs.readFileSync('src/db/migrations/002_snag_rebuild.sql', 'utf8');
const connStr = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop';

fs.writeFileSync('temp_migration.sql', sql);

// PostgreSQL 18 installation
exec(`"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe" "${connStr}" -f temp_migration.sql`, (error, stdout, stderr) => {
  fs.unlinkSync('temp_migration.sql');

  if (error) {
    console.error('❌ Migration failed:', error.message);
    if (stderr) console.error('Details:', stderr);
    return;
  }
  
  console.log('✅ Migration successful!');
  if (stdout) console.log(stdout);
});