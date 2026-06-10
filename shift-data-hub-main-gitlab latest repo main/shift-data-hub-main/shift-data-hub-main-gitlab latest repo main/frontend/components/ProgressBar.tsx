interface ProgressBarProps {
  value: number; // 0-100
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  showGlow?: boolean;
}

export default function ProgressBar({
  value,
  height = 6,
  className,
  style,
  showGlow = true,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height,
        background: 'var(--border)',
        borderRadius: 999,
        overflow: 'hidden',
        ...style,
      }}
    >
      <span
        style={{
          display: 'block',
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, var(--mint-dark), var(--mint))',
          boxShadow: showGlow ? '0 0 10px var(--mint-glow)' : undefined,
          transition: 'width 0.6s cubic-bezier(.16,1,.3,1)',
        }}
      />
    </div>
  );
}
