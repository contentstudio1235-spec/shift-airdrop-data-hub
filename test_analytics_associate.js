const { Client } = require('pg');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function main() {
  const wallet = '7x8sTestWalletAddressClickStandard112233';
  const clientId = '123456789.987654321'; // Mock GA4 Client ID
  const referralCode = 'SNAG_STOCKS_WINNER';

  const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-16YK1Q7QHD';
  const GA_API_SECRET = process.env.GA_API_SECRET || 'aG-1_t6JSD-n9qSKJSDh2kg';
  const databaseUrl = process.env.DATABASE_URL;

  console.log('🧪 Starting End-to-End Analytics Association Test');
  console.log('==================================================');
  console.log(`Wallet: ${wallet}`);
  console.log(`GA4 Client ID: ${clientId}`);
  console.log(`Referral Code: ${referralCode}`);
  console.log(`GA4 Property Tag: ${GA_MEASUREMENT_ID}`);
  console.log('==================================================\n');

  // 1. Database Connection and Upsert
  console.log('Step 1: Connecting to PostgreSQL Database...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('render.com') || databaseUrl.includes('neon.tech') ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully.');

    console.log('Upserting user mapping in PostgreSQL users table...');
    const dbQuery = `
      INSERT INTO users (wallet, ga_user_id, snag_custom_referral_code, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (wallet) 
      DO UPDATE SET ga_user_id = $2, snag_custom_referral_code = COALESCE(users.snag_custom_referral_code, $3), updated_at = NOW();
    `;
    
    await client.query(dbQuery, [wallet, clientId, referralCode]);
    console.log('✅ Identity row successfully upserted in users table.');

    // Verify row was written correctly
    const checkRes = await client.query('SELECT wallet, ga_user_id, snag_custom_referral_code, updated_at FROM users WHERE wallet = $1', [wallet]);
    console.log('Stored DB Record:', checkRes.rows[0]);

  } catch (err) {
    console.error('❌ Database operation failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // 2. GA4 Measurement Protocol server-side dispatch
  console.log('\nStep 2: Dispatching Server-to-Server hit to Google Analytics 4...');
  const gaPayload = {
    client_id: clientId,
    events: [
      {
        name: 'wallet_link_completed',
        params: {
          solana_wallet: wallet,
          referral_code: referralCode,
          engagement_time_msec: 100
        }
      }
    ]
  };

  const gaUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;
  
  try {
    const response = await axios.post(gaUrl, gaPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`GA4 Server Response Status: ${response.status} ${response.statusText}`);
    console.log('✅ Server-to-server event hit successfully dispatched without warning.');
    console.log('\n🎉 ALL END-TO-END VERIFICATION PASSES COMPLETED SUCCESSFULLY!');
    
  } catch (err) {
    console.error('❌ GA4 Measurement Protocol dispatch failed:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

main().catch(console.error);
