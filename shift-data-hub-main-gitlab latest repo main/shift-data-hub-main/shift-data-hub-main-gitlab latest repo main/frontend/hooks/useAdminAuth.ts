// ============================================================
// useAdminAuth — Admin authentication hook
// Matches the same passcode pattern used in admin routes
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

const ADMIN_KEY_STORAGE = 'shift_admin_key';
const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ShiftRwa2026@@$$Key';

interface UseAdminAuthReturn {
  isAuthenticated: boolean;
  adminKey: string;
  login: (key: string) => boolean;
  logout: () => void;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');

  // Restore from sessionStorage on mount (only in browser)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (stored && stored === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setAdminKey(stored);
    }
  }, []);

  const login = useCallback((key: string): boolean => {
    if (key === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setAdminKey(key);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
      }
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setAdminKey('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    }
  }, []);

  return { isAuthenticated, adminKey, login, logout };
}
