'use client';
import { useState } from 'react';

const TOKEN_IMAGE_BASE = 'https://tokens-data.shiftrwa.xyz/tokens';

interface TokenLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function TokenLogo({ symbol, size = 28, className }: TokenLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = symbol.slice(0, 3).toUpperCase();

  if (failed) {
    return (
      <div
        className={className ?? 'asset-logo'}
        style={{ width: size, height: size, fontSize: size < 24 ? 8 : 9, flexShrink: 0 }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${TOKEN_IMAGE_BASE}/${symbol}.png`}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}
