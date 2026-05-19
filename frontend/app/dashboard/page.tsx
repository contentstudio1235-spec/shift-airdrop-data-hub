'use client';

import { useState, useEffect } from 'react';
import { fetchDashboard, fetchPositions } from '@/lib/api';

export default function Dashboard() {
  const [wallet, setWallet] = useState('');
  const [data, setData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoadDashboard() {
    if (!wallet.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dashData = await fetchDashboard(wallet);
      setData(dashData);

      try {
        const posData = await fetchPositions(wallet);
        setPositions(posData.positions || []);
      } catch {
        // Positions endpoint optional for dashboard display
        setPositions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">Your Dashboard</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter wallet address..."
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleLoadDashboard()}
          />
          <button
            onClick={handleLoadDashboard}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Total XP</p>
              <p className="text-3xl font-bold">{data.totalXp?.toFixed(2) || '0'}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Claim Multiplier</p>
              <p className="text-3xl font-bold">{data.claimMultiplier?.toFixed(2) || '1.0'}x</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Active Positions</p>
              <p className="text-3xl font-bold">{data.activePositions || '0'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Active Positions</h3>
            {positions.length === 0 ? (
              <p className="text-sm text-slate-400">No active positions</p>
            ) : (
              <div className="space-y-3">
                {positions.map((pos: any) => (
                  <div key={pos.id} className="flex items-between justify-between rounded border border-slate-700 p-3">
                    <div>
                      <p className="font-semibold">{pos.asset}</p>
                      <p className="text-sm text-slate-400">${pos.positionSizeUsd?.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{pos.xpPerWeek?.toFixed(2)} XP/week</p>
                      <p className="text-sm text-slate-400">{pos.currentMultiplier?.toFixed(2)}x</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
