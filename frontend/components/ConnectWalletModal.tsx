'use client';

import { useCallback, useEffect } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
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
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  // Open wallet selection modal automatically when component mounts
  useEffect(() => {
    setVisible(true);
  }, [setVisible]);

  // Close parent modal when wallet connects
  useEffect(() => {
    if (connected && onClose) {
      // Close wallet modal first
      setVisible(false);
      // Then close parent modal
      onClose();
    }
  }, [connected, onClose, setVisible]);

  // Don't render anything - just trigger the modal via the hook
  return null;
}
