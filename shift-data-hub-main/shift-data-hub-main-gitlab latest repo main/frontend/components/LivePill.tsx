interface LivePillProps {
  live?: boolean;
  loading?: boolean;
  label?: string;
}

export default function LivePill({ live = true, loading = false, label }: LivePillProps) {
  const color = loading ? 'var(--text-mute)' : live ? 'var(--mint)' : 'var(--amber)';
  const text = loading ? 'LOADING' : label || (live ? 'LIVE' : 'OFFLINE');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: loading
          ? 'rgba(255,255,255,0.04)'
          : live
          ? 'var(--mint-soft)'
          : 'var(--amber-soft)',
        border: `1px solid ${color}30`,
        borderRadius: 999,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'var(--font-space)',
        color,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: color,
          animation: live && !loading ? 'livePulse 2s ease infinite' : undefined,
        }}
      />
      {text}
    </span>
  );
}
