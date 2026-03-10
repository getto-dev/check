'use client';

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallBannerProps {
  onInstall: () => Promise<boolean>;
  canInstall: boolean;
  isInstalled: boolean;
  onDismiss?: () => void;
}

const DISMISS_KEY = 'pwa-install-banner-dismissed';
const DISMISS_COUNT_KEY = 'pwa-install-banner-dismiss-count';
const DISMISS_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_DISMISS_COUNT = 3; // Stop showing after 3 dismissals

export const InstallBanner = memo(function InstallBanner({
  onInstall,
  onDismiss,
  canInstall,
  isInstalled,
}: InstallBannerProps) {
  const [shouldBeVisible, setShouldBeVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check dismissal count
  const dismissCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const count = localStorage.getItem(DISMISS_COUNT_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }, []);

  // Check dismissal on mount
  const wasRecentlyDismissed = useMemo(() => {
    if (typeof window === 'undefined') return false;

    // Check if dismissed too many times
    if (dismissCount >= MAX_DISMISS_COUNT) return true;

    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        return elapsed < DISMISS_DURATION;
      }
    } catch {
      // Ignore localStorage errors
    }
    return false;
  }, [dismissCount]);

  // Show banner after user interaction or when canInstall becomes true
  useEffect(() => {
    // Don't show if already installed, or was dismissed
    if (isInstalled || wasRecentlyDismissed || dismissed) {
      return;
    }

    // If can't install, just wait for it to become available
    if (!canInstall) {
      return;
    }

    // Show banner shortly after canInstall becomes true
    const showTimer = setTimeout(() => {
      setShouldBeVisible(true);
    }, 1000);

    return () => {
      clearTimeout(showTimer);
    };
  }, [isInstalled, canInstall, wasRecentlyDismissed, dismissed]);

  const handleInstall = useCallback(async () => {
    setIsInstalling(true);
    const success = await onInstall();
    if (success) {
      setShouldBeVisible(false);
      // Clear dismiss count on successful install
      try {
        localStorage.removeItem(DISMISS_COUNT_KEY);
      } catch {
        // Ignore localStorage errors
      }
    }
    setIsInstalling(false);
  }, [onInstall]);

  const handleDismiss = useCallback(() => {
    // Save dismiss timestamp and increment count
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      const newCount = dismissCount + 1;
      localStorage.setItem(DISMISS_COUNT_KEY, newCount.toString());
    } catch {
      // Ignore localStorage errors
    }

    setShouldBeVisible(false);
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss, dismissCount]);

  // Banner is visible only if not installed, should be visible and can still install
  const isVisible = !isInstalled && shouldBeVisible && canInstall;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-safe animate-slide-up'
      )}
      role="dialog"
      aria-label="Установить приложение"
    >
      <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md mx-auto p-4 mb-3">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-card-foreground">
              Установить приложение
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Добавьте СантехСчет на главный экран для быстрого доступа
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-shrink-0 touch-manipulation"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className={cn(
            'w-full mt-3 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all touch-manipulation',
            'gradient-bg text-white hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]',
            isInstalling && 'opacity-70 pointer-events-none'
          )}
        >
          {isInstalling ? 'Установка...' : 'Установить'}
        </button>
      </div>
    </div>
  );
});
