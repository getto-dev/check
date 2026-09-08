'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Kind = 'success' | 'error' | 'info';
type ToastContext = { showToast: (message: string, kind?: Kind) => void };

const ToastContext = createContext<ToastContext>({
  showToast: () => undefined,
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const showToast = useCallback((message: string, kind: Kind = 'info') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  return <ToastContext.Provider value={{ showToast }}>
    {children}
    {toast && <div className={cn('fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl', toast.kind === 'error' ? 'bg-red-600 text-white' : toast.kind === 'success' ? 'bg-green-600 text-white' : 'bg-foreground text-background')} role="status" aria-live="polite">{toast.message}</div>}
  </ToastContext.Provider>;
}
