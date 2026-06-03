'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminPages = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/badges', label: 'Badges', icon: '🎖️' },
    { href: '/admin/certificates', label: 'Certificates', icon: '🏆' },
    { href: '/admin/events', label: 'Events', icon: '📅' },
    { href: '/admin/configuration', label: 'Configuration', icon: '⚙️' },
    { href: '/admin/announcements', label: 'Announcements', icon: '📢' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/audit', label: 'Audit Log', icon: '📋' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0e1117' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 0,
          background: 'rgba(255,255,255,0.02)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          transition: 'width 0.3s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--mint)', margin: 0 }}>ADMIN</h2>
        </div>

        <nav style={{ flex: 1, padding: '8px', overflow: 'auto' }}>
          {adminPages.map((page) => {
            const isActive = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: isActive ? 'var(--mint)' : 'var(--text)',
                  background: isActive ? 'rgba(38, 200, 184, 0.1)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--mint)' : '3px solid transparent',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  marginBottom: '4px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 16 }}>{page.icon}</span>
                <span>{page.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'var(--text-mute)' }}>
          <p style={{ margin: '8px 0' }}>Auth: Admin Passcode</p>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {sidebarOpen ? '▸' : '◂'}
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-mute)' }}>SHIFT Admin Panel</h1>
          <div style={{ flex: 1 }} />
          <Link
            href="/"
            style={{
              padding: '8px 12px',
              background: 'rgba(38, 200, 184, 0.1)',
              border: '1px solid var(--mint)',
              borderRadius: 6,
              color: 'var(--mint)',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Exit Admin
          </Link>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  );
}
