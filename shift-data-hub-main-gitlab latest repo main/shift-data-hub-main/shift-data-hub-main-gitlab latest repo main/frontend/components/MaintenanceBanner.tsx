'use client';

import { useEffect, useState } from 'react';

export function MaintenanceBanner() {
  const [isMaintenanceTime, setIsMaintenanceTime] = useState(false);

  useEffect(() => {
    // Check if we're in maintenance window
    // May 27, 01:00-02:00 UTC
    const checkMaintenance = () => {
      const now = new Date();
      const utcDate = now.getUTCDate();
      const utcHours = now.getUTCHours();

      // Maintenance: May 27 (date=27), hours 1-2 (01:00-02:00 UTC)
      const isMaintenance = utcDate === 27 && utcHours >= 1 && utcHours < 2;
      setIsMaintenanceTime(isMaintenance);
    };

    // Check immediately
    checkMaintenance();

    // Check every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isMaintenanceTime) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#f59e0b',
        color: '#1f2937',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span>⚙️</span>
      <span>
        Scheduled maintenance in progress (01:00-02:00 UTC). Displaying cached data.
        We'll be back shortly!
      </span>
    </div>
  );
}
