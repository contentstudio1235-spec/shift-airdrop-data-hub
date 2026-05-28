'use client';

import { useCallback } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface ConnectWalletModalProps {
  onClose?: () => void;
}

/**
 * ConnectWalletModal component
 *
 * Uses official @solana/wallet-adapter-react-ui with built-in wallet logos
 * Supports:
 * - Phantom (Solana)
 * - Solflare (Solana)
 * - Trust Wallet (Solana)
 * - MetaMask (EVM & Solana optional)
 * - WalletConnect
 *
 * Features:
 * - Official wallet logos and branding
 * - Auto-detection of installed wallets
 * - Last wallet remembered
 * - Responsive design
 */
export default function ConnectWalletModal({ onClose }: ConnectWalletModalProps) {
  const { wallet, connected } = useWallet();

  const handleWalletConnect = useCallback(() => {
    if (connected && onClose) {
      onClose();
    }
  }, [connected, onClose]);

  return (
    <div className="flex items-center justify-center">
      {/*
        Official WalletMultiButton from @solana/wallet-adapter-react-ui
        Includes:
        - Official wallet logos (Phantom, Solflare, Trust, MetaMask, etc.)
        - Automatic wallet detection
        - Connected wallet display
        - Disconnect functionality
        - Mobile responsive
      */}
      <WalletMultiButton
        className="wallet-adapter-button-trigger"
        onClick={handleWalletConnect}
      />
    </div>
  );
}
