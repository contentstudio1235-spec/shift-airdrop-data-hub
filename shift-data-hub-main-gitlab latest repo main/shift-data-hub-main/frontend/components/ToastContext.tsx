'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: number;
  msg: string;
}

interface ToastContextValue {
  push: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const push = useCallback((msg: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []); // eslint-disable-line

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (msg: string) => void {
  return useContext(ToastContext).push;
}
