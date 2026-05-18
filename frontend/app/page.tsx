'use client';

import { useState, useEffect } from 'react';
import { healthCheck } from '@/lib/api';

export default function Home() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'down'>('checking');

  useEffect(() => {
    healthCheck().then(ok => setApiStatus(ok ? 'ok' : 'down'));
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">Welcome to SHIFT Airdrop</h2>
        <p className="mb-4 text-slate-300">
          Trade on Jupiter and earn XP points. The more you trade, the more you earn!
        </p>

        <div className="mt-6 flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${
            apiStatus === 'ok' ? 'bg-green-500' :
            apiStatus === 'checking' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          <span className="text-sm">
            Backend: {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'ok' ? '✅ Connected' : '❌ Offline'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-2 text-lg font-semibold">Dashboard</h3>
          <p className="text-sm text-slate-400 mb-4">View your XP, positions, and badges</p>
          <a href="/dashboard" className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
            Go to Dashboard →
          </a>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="mb-2 text-lg font-semibold">Leaderboard</h3>
          <p className="text-sm text-slate-400 mb-4">See top traders and compete</p>
          <a href="/leaderboard" className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
            View Rankings →
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-4 text-lg font-semibold">How It Works</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>✓ Trade on Jupiter with any SPL token</li>
          <li>✓ Each trade generates XP based on size and duration</li>
          <li>✓ Hold positions longer for multiplier bonuses</li>
          <li>✓ Earn badges for milestones and special events</li>
          <li>✓ Redeem XP for SHIFT tokens and rewards</li>
        </ul>
      </div>
    </div>
  );
}
