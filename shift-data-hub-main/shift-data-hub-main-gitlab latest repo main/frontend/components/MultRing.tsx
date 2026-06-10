interface MultRingProps {
  value: number;
  max?: number;
  size?: number;
}

export default function MultRing({ value, max = 3.0, size = 120 }: MultRingProps) {
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, (value - 1.0) / (max - 1.0)));
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="multRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#26C8B8" />
          <stop offset="100%" stopColor="#07638C" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="8"
      />

      {/* Progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="url(#multRingGrad)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.16,1,.3,1)' }}
      />

      {/* Center text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="var(--text)"
        fontSize="20"
        fontWeight="700"
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', sans-serif"
      >
        {value.toFixed(2)}x
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill="var(--text-mute)"
        fontSize="10"
        fontWeight="600"
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', sans-serif"
        letterSpacing="0.06em"
      >
        MULTIPLIER
      </text>
    </svg>
  );
}
