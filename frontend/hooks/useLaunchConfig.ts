// ============================================================
// Hook: useLaunchConfig — Real-time Launch Phase Polling
// ============================================================
// Polls the launch config API every 10 seconds for real-time updates.
// Automatically updates when admin panel changes are made.

'use client';

import { useState, useEffect } from 'react';
import { fetchLaunchConfig, type LaunchPhaseInfo } from '@/lib/api';

export function useLaunchConfig() {
  const [phase, setPhase] = useState<LaunchPhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch immediately
    const fetchConfig = async () => {
      try {
        const data = await fetchLaunchConfig();
        if (data?.phase) {
          setPhase(data.phase);
        }
      } catch (error) {
        console.error('Failed to fetch launch config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();

    // Poll every 10 seconds for admin panel changes
    const interval = setInterval(fetchConfig, 10000);

    return () => clearInterval(interval);
  }, []);

  return { phase, loading };
}
