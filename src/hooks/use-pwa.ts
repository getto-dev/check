'use client';

import { useState, useEffect, useCallback } from 'react';

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
}

const CURRENT_VERSION = '10.9.1';

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

export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>(() => ({
    ...getStandaloneStatus(),
    canInstall: false,
    needsUpdate: false,
    installPrompt: null,
  }));

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event fired');
      const promptEvent = e as BeforeInstallPromptEvent;
      setStatus((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: promptEvent,
      }));
    };

    const handleAppInstalled = () => {
      console.log('PWA: app installed');
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }));
    };

    const handleControllerChange = () => {
      setStatus((prev) => ({ ...prev, needsUpdate: true }));
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VERSION') {
        const swVersion = event.data.version;
        if (swVersion && swVersion !== CURRENT_VERSION) {
          setStatus((prev) => ({ ...prev, needsUpdate: true }));
        }
      }
    };

    console.log('PWA: Setting up listeners, isStandalone:', getStandaloneStatus());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
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
        setStatus((prev) => ({
          ...prev,
          isInstalled: true,
          canInstall: false,
          installPrompt: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('PWA: Install error:', error);
      return false;
    }
  }, [status.installPrompt]);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const response = await fetch('./version.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return false;

      const data = await response.json();
      const serverVersion = data.version;

      if (serverVersion && serverVersion !== CURRENT_VERSION) {
        setStatus((prev) => ({ ...prev, needsUpdate: true }));
        return true;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }

      return false;
    } catch (error) {
      console.error('PWA: Update check error:', error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage('skipWaiting');
          setTimeout(() => window.location.reload(), 500);
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, []);

  return {
    ...status,
    install,
    checkForUpdates,
    applyUpdate,
  };
}
