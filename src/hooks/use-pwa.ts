'use client';

import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION } from '@/lib/constants';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  needsUpdate: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  waitingWorker: ServiceWorker | null;
}

// Storage keys for dismissed states
const NATIVE_DISMISS_KEY = 'pwa-native-install-dismissed';
const NATIVE_DISMISS_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

function getStandaloneStatus() {
  if (typeof window === 'undefined') {
    return { isStandalone: false, isInstalled: false };
  }

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  const isInstalled = isStandalone || document.referrer.includes('android-app://');

  return { isStandalone, isInstalled };
}

// Check if native install dialog was recently dismissed
function wasNativeInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissedAt = localStorage.getItem(NATIVE_DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      return elapsed < NATIVE_DISMISS_DURATION;
    }
  } catch {
    // Ignore localStorage errors
  }
  return false;
}

export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>(() => ({
    ...getStandaloneStatus(),
    canInstall: !wasNativeInstallDismissed(),
    needsUpdate: false,
    installPrompt: null,
    waitingWorker: null,
  }));

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event fired');

      const promptEvent = e as BeforeInstallPromptEvent;
      setStatus((prev) => {
        // Don't override if user recently dismissed native dialog
        if (wasNativeInstallDismissed()) {
          console.log('PWA: Native install was recently dismissed');
          return prev;
        }
        return {
          ...prev,
          canInstall: true,
          installPrompt: promptEvent,
        };
      });
    };

    const handleAppInstalled = () => {
      console.log('PWA: app installed');
      // Clear dismiss state on successful install
      try {
        localStorage.removeItem(NATIVE_DISMISS_KEY);
      } catch {
        // Ignore localStorage errors
      }
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }));
    };

    const handleControllerChange = () => {
      console.log('PWA: controller changed, reloading...');
      window.location.reload();
    };

    const handleSWMessage = (event: MessageEvent) => {
      console.log('PWA: SW message received:', event.data?.type);

      if (event.data?.type === 'SW_INSTALLING') {
        const swVersion = event.data.version;
        if (swVersion && swVersion !== APP_VERSION) {
          console.log('PWA: New version installing:', swVersion);
        }
      }

      if (event.data?.type === 'SW_ACTIVATED') {
        const swVersion = event.data.version;
        if (swVersion && swVersion !== APP_VERSION) {
          console.log('PWA: New version activated:', swVersion, '(current:', APP_VERSION, ')');
          setStatus((prev) => ({ ...prev, needsUpdate: true }));
        }
      }

      if (event.data?.type === 'VERSION') {
        const swVersion = event.data.version;
        if (swVersion && swVersion !== APP_VERSION) {
          setStatus((prev) => ({ ...prev, needsUpdate: true }));
        }
      }
    };

    // Setup Service Worker update detection
    const setupSWUpdateDetection = async () => {
      if (!('serviceWorker' in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          console.log('PWA: New SW found, state:', newWorker.state);

          newWorker.addEventListener('statechange', () => {
            console.log('PWA: New SW state changed to:', newWorker.state);

            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is waiting to activate
              console.log('PWA: New SW installed and waiting');
              setStatus((prev) => ({
                ...prev,
                needsUpdate: true,
                waitingWorker: newWorker,
              }));
            }
          });
        });

        // Check if there's already a waiting worker
        if (registration.waiting) {
          console.log('PWA: SW already waiting');
          setStatus((prev) => ({
            ...prev,
            needsUpdate: true,
            waitingWorker: registration.waiting,
          }));
        }
      } catch (error) {
        console.error('PWA: SW setup error:', error);
      }
    };

    console.log('PWA: Setting up listeners, isStandalone:', getStandaloneStatus());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      setupSWUpdateDetection();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  const install = useCallback(async () => {
    if (!status.installPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }

    try {
      console.log('PWA: Showing install prompt');
      await status.installPrompt.prompt();
      const { outcome } = await status.installPrompt.userChoice;
      console.log('PWA: Install outcome:', outcome);

      if (outcome === 'accepted') {
        try {
          localStorage.removeItem(NATIVE_DISMISS_KEY);
        } catch {
          // Ignore localStorage errors
        }
        setStatus((prev) => ({
          ...prev,
          isInstalled: true,
          canInstall: false,
          installPrompt: null,
        }));
        return true;
      } else {
        // User dismissed the native dialog - save timestamp
        console.log('PWA: Native install dismissed, saving timestamp');
        try {
          localStorage.setItem(NATIVE_DISMISS_KEY, Date.now().toString());
        } catch {
          // Ignore localStorage errors
        }
        setStatus((prev) => ({
          ...prev,
          canInstall: false,
          installPrompt: null,
        }));
        return false;
      }
    } catch (error) {
      console.error('PWA: Install error:', error);
      return false;
    }
  }, [status.installPrompt]);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    // Don't check for updates when offline
    if (!navigator.onLine) {
      console.log('PWA: Offline, skipping update check');
      return false;
    }

    try {
      const response = await fetch('./version.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return false;

      const data = await response.json();
      const serverVersion = data.version;

      console.log('PWA: Server version:', serverVersion, 'App version:', APP_VERSION);

      if (serverVersion && serverVersion !== APP_VERSION) {
        console.log('PWA: New version available on server');
        setStatus((prev) => ({ ...prev, needsUpdate: true }));
        return true;
      }

      // Trigger SW update check
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }

      return false;
    } catch (error) {
      // Silently fail when offline - this is expected
      console.log('PWA: Update check failed (likely offline)');
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    console.log('PWA: Applying update...');

    if (status.waitingWorker) {
      // Send skipWaiting to the waiting worker
      status.waitingWorker.postMessage('skipWaiting');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage('skipWaiting');
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, [status.waitingWorker]);

  return {
    ...status,
    install,
    checkForUpdates,
    applyUpdate,
  };
}
