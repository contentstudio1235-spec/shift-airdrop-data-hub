"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DATABASE_URL = 'postgresql://shift_airdrop_user:pEifhnC48JpxkANEc2sqevKWoozcq5AQ@dpg-d86188egvqtc73e92fl0-a.ohio-postgres.render.com/shift_airdrop?sslmode=require';
const pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: false },
});
async function getFulTx() {
    try {
        const result = await pool.query(`SELECT tx_signature_open, asset FROM positions 
       WHERE wallet = $1 AND position_size_usd = 0 AND status = 'open'
       LIMIT 1`, ['CR2fyBnGxzJDvqJ8warC6JhK1YBWzhkHeJfRiukpY89Q']);
        if (result.rows.length > 0) {
            const tx = result.rows[0];
            console.log(`Full TX Sig: ${tx.tx_signature_open}`);
            console.log(`Asset: ${tx.asset}`);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await pool.end();
    }
}
getFulTx();
//# sourceMappingURL=get-full-tx.js.map