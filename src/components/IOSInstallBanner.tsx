'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { Home, PlusSquare, Share, X } from 'lucide-react';

interface IOSInstallBannerProps {
  isStandalone: boolean;
  isInstalled: boolean;
}

const DISMISS_KEY = 'pwa-ios-banner-dismissed';
const DISMISS_DURATION = 60 * 60 * 1000;

function isIOSSafari() {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isIPadOS = /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 0;
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return ((isIOSDevice || isIPadOS) && isSafari);
}

function wasDismissedRecently() {
  if (typeof window === 'undefined') return false;
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION;
  } catch {
    return false;
  }
}

export const IOSInstallBanner = memo(function IOSInstallBanner({ isStandalone, isInstalled }: IOSInstallBannerProps) {
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [showDetails, setShowDetails] = useState(false);
  const isIOS = useMemo(isIOSSafari, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage errors.
    }
    setDismissed(true);
  }, []);

  if (!isIOS || isStandalone || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-safe animate-slide-up" role="dialog" aria-label="Установить приложение на iOS">
      <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md mx-auto p-4 mb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-card-foreground">Добавить Smeta на экран «Домой»</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Работайте быстрее и открывайте Smeta как приложение.</p>
          </div>
          <button type="button" onClick={handleDismiss} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Закрыть">
            <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        {!showDetails ? (
          <button type="button" onClick={() => setShowDetails(true)} className="w-full min-h-11 mt-3 py-2 px-4 rounded-xl font-semibold text-sm bg-muted hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation">
            Как установить?
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <Share className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="text-xs"><strong>1.</strong> Нажмите «Поделиться» в Safari.</div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <PlusSquare className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="text-xs"><strong>2.</strong> Выберите «На экран Домой».</div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <Home className="w-5 h-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="text-xs"><strong>3.</strong> Нажмите «Добавить».</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
