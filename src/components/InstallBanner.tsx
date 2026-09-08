'use client';

import { memo, useCallback, useState } from 'react';
import { Download, X } from 'lucide-react';

interface InstallBannerProps {
  onInstall: () => Promise<boolean>;
  canInstall: boolean;
  isInstalled: boolean;
}

const DISMISS_KEY = 'pwa-install-banner-dismissed';
const DISMISS_COUNT_KEY = 'pwa-install-banner-dismiss-count';
const DISMISS_DURATION = 60 * 60 * 1000;
const MAX_DISMISS_COUNT = 3;

function wasDismissedRecently() {
  if (typeof window === 'undefined') return false;
  try {
    const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0');
    if (count >= MAX_DISMISS_COUNT) return true;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION;
  } catch {
    return false;
  }
}

export const InstallBanner = memo(function InstallBanner({ onInstall, canInstall, isInstalled }: InstallBannerProps) {
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    const success = await onInstall();
    setIsInstalling(false);
    if (success) {
      try {
        localStorage.removeItem(DISMISS_KEY);
        localStorage.removeItem(DISMISS_COUNT_KEY);
      } catch {
        // Ignore storage errors.
      }
      setDismissed(true);
    }
  }, [onInstall]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      const count = Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0') + 1;
      localStorage.setItem(DISMISS_COUNT_KEY, String(count));
    } catch {
      // Ignore storage errors.
    }
    setDismissed(true);
  }, []);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-safe animate-slide-up" role="dialog" aria-label="Установить приложение">
      <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md mx-auto p-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-card-foreground">Установить приложение</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Для работы офлайн и быстрого запуска</p>
          </div>
          <button type="button" onClick={handleDismiss} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Закрыть">
            <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={() => void handleInstall()} disabled={isInstalling} className="w-full min-h-11 mt-3 py-2.5 px-4 rounded-xl font-semibold text-sm gradient-bg text-white hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation">
          {isInstalling ? 'Установка...' : 'Установить'}
        </button>
      </div>
    </div>
  );
});
