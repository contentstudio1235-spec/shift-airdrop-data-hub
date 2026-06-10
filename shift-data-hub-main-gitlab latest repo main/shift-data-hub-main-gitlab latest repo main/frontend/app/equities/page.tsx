export default function EquitiesPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          background: 'rgba(247,162,59,0.12)',
          border: '1px solid rgba(247,162,59,0.25)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          color: '#f7a23b',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        Season 2
      </span>

      <h1
        style={{
          fontSize: 52,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
          lineHeight: 1.1,
        }}
      >
        Equities Score
      </h1>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'var(--font-space)',
          color: 'var(--text-dim)',
          marginBottom: 20,
        }}
      >
        Coming Soon
      </div>

      <p
        style={{
          fontSize: 15,
          color: 'var(--text-dim)',
          maxWidth: 440,
          lineHeight: 1.6,
          marginBottom: 32,
        }}
      >
        On-chain wallet scan to assess your equities trading history and assign a personalised score
        that influences your SHIFT token allocation.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: 40,
        }}
      >
        {['Wallet scan', 'Trading history', 'Custom score', 'Allocation boost'].map((f) => (
          <span
            key={f}
            style={{
              padding: '6px 14px',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--text-dim)',
            }}
          >
            {f}
          </span>
        ))}
      </div>

      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '24px 32px',
          maxWidth: 380,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
          Stay updated
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Follow{' '}
          <a
            href="https://twitter.com/ShiftRWA"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--mint)' }}
          >
            @ShiftRWA
          </a>{' '}
          for Season 2 launch announcements.
        </p>
      </div>
    </div>
  );
}
