'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastContext';

interface AdminLog {
  id: string;
  admin_wallet: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_value?: any;
  new_value?: any;
  reason?: string;
  ip_address?: string;
  created_at: string;
}

interface AuditViewerProps {
  adminPasscode: string;
  apiUrl?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://shift-airdrop-backend.onrender.com';

/**
 * Reusable Audit Log Viewer Component
 * Shows admin activity with filtering and export capabilities
 */
export default function AuditViewer({ adminPasscode, apiUrl = API_URL }: AuditViewerProps) {
  const toast = useToast();

  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterAdminWallet, setFilterAdminWallet] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Fetch logs with filters
  const fetchLogs = async () => {
    if (!adminPasscode) {
      toast('Admin passcode required');
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (filterResourceType) params.append('resource_type', filterResourceType);
      if (filterAdminWallet) params.append('admin_wallet', filterAdminWallet);
      if (filterStartDate) params.append('start_date', filterStartDate);
      if (filterEndDate) params.append('end_date', filterEndDate);
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());

      const res = await fetch(
        `${apiUrl}/api/admin/audit?${params.toString()}`,
        {
          headers: { 'x-admin-key': adminPasscode },
        }
      );

      if (!res.ok) {
        toast(`Failed to fetch audit logs: ${res.statusText}`);
        return;
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      toast(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on filter changes
  useEffect(() => {
    setPage(1); // Reset to page 1 on filter change
    fetchLogs();
  }, [filterAction, filterResourceType, filterAdminWallet, filterStartDate, filterEndDate, limit]);

  // Fetch when page changes
  useEffect(() => {
    fetchLogs();
  }, [page]);

  // Export logs to CSV
  const handleExport = async () => {
    try {
      const csv = [
        ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'Reason', 'IP Address'].join(','),
        ...logs.map(log =>
          [
            new Date(log.created_at).toISOString(),
            log.admin_wallet || 'unknown',
            log.action,
            log.resource_type || 'N/A',
            log.resource_id || 'N/A',
            `"${(log.reason || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
            log.ip_address || 'unknown',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast('Audit logs exported to CSV');
    } catch (error) {
      toast(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const maxPages = Math.ceil(totalCount / limit);

  return (
    <div className="audit-viewer" style={{ padding: '20px 0' }}>
      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <h2 style={{ marginBottom: '16px' }}>Filters</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              Action
            </label>
            <input
              type="text"
              placeholder="e.g., badge_created"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              Resource Type
            </label>
            <select
              value={filterResourceType}
              onChange={e => setFilterResourceType(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All</option>
              <option value="badge">Badge</option>
              <option value="certificate">Certificate</option>
              <option value="config">Config</option>
              <option value="event">Event</option>
              <option value="user">User</option>
              <option value="announcement">Announcement</option>
              <option value="kol">KOL</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              Admin Wallet
            </label>
            <input
              type="text"
              placeholder="Admin wallet"
              value={filterAdminWallet}
              onChange={e => setFilterAdminWallet(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              Start Date
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              End Date
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <button className="btn secondary" onClick={handleExport} disabled={logs.length === 0}>
          Export to CSV
        </button>
      </div>

      {/* Logs Table */}
      <div className="card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-mute)' }}>Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-mute)' }}>No audit logs found</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Timestamp</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Resource</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Admin</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                        {log.resource_type} → {log.resource_id}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {log.admin_wallet?.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-mute)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-mute)' }}>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={limit}
                  onChange={e => {
                    setLimit(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="input"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <button
                  className="btn secondary"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '12px' }}>
                  Page {page} / {maxPages}
                </span>
                <button
                  className="btn secondary"
                  onClick={() => setPage(Math.min(maxPages, page + 1))}
                  disabled={page === maxPages}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
