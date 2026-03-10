'use client';

import { memo, useCallback, useState, useEffect, useMemo } from 'react';
import { X, Share, PlusSquare, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IOSInstallBannerProps {
  isStandalone: boolean;
  isInstalled: boolean;
  onDismiss?: () => void;
}

const DISMISS_KEY = 'pwa-ios-banner-dismissed';
const DISMISS_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Check if running on iOS Safari (including iPadOS 13+)
function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  // Check for iOS devices (iPhone, iPod, older iPad)
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);

  // Check for iPadOS 13+ (reports as Macintosh with touch support)
  // iPadOS 13+ sends desktop-like UA but has touch points
  const isIPadOS = /Macintosh/.test(userAgent) &&
                   navigator.maxTouchPoints > 0 &&
                   !window.MSStream;

  // Check if it's Safari (not Chrome, Firefox, Edge on iOS)
  const isSafari = /Safari/.test(userAgent) &&
                   !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

  // Return true for iOS Safari or iPadOS Safari
  return (isIOSDevice && isSafari) || (isIPadOS && isSafari);
}

export const IOSInstallBanner = memo(function IOSInstallBanner({
  onDismiss,
  isStandalone,
  isInstalled,
}: IOSInstallBannerProps) {
  const [shouldBeVisible, setShouldBeVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check dismissal on mount
  const wasRecentlyDismissed = useMemo(() => {
    if (typeof window === 'undefined') return false;
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
  }, []);

  // Check if iOS Safari on mount
  const isIOS = useMemo(() => isIOSSafari(), []);

  // Show banner after a short delay
  useEffect(() => {
    // Don't show if already installed, standalone, not iOS, or was dismissed
    if (isInstalled || isStandalone || !isIOS || wasRecentlyDismissed || dismissed) {
      return;
    }

    // Show banner after 2 seconds
    const showTimer = setTimeout(() => {
      setShouldBeVisible(true);
    }, 2000);

    return () => {
      clearTimeout(showTimer);
    };
  }, [isInstalled, isStandalone, isIOS, wasRecentlyDismissed, dismissed]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
    setShouldBeVisible(false);
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Banner is visible only if not installed, not standalone, and is iOS
  const isVisible = !isInstalled && !isStandalone && shouldBeVisible && isIOS;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-safe animate-slide-up'
      )}
      role="dialog"
      aria-label="Установить приложение на iOS"
    >
      <div className="bg-card border border-border rounded-2xl shadow-lg max-w-md mx-auto p-4 mb-3">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-card-foreground">
              Установить приложение
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Добавьте СантехСчет на главный экран
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

        {/* Show more button */}
        {!showDetails && (
          <button
            onClick={() => setShowDetails(true)}
            className="w-full mt-3 py-2 px-4 rounded-xl font-semibold text-sm bg-muted text-card-foreground hover:bg-muted/80 transition-colors touch-manipulation"
          >
            Как установить?
          </button>
        )}

        {/* Instructions */}
        {showDetails && (
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Share className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-card-foreground">
                  Шаг 1
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Нажмите кнопку &quot;Поделиться&quot; внизу экрана
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <PlusSquare className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-card-foreground">
                  Шаг 2
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Пролистайте вниз и выберите &quot;На экран Домой&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-card-foreground">
                  Шаг 3
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Нажмите &quot;Добавить&quot; в правом верхнем углу
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
