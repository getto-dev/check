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

// Функция для определения standalone режима
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
  // Инициализируем состояние с правильными значениями
  const [status, setStatus] = useState<PWAStatus>(() => ({
    ...getStandaloneStatus(),
    canInstall: false,
    needsUpdate: false,
    installPrompt: null,
  }));

  useEffect(() => {
    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setStatus((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: promptEvent,
      }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        installPrompt: null,
      }));
    };

    // Listen for service worker updates
    const handleControllerChange = () => {
      setStatus((prev) => ({ ...prev, needsUpdate: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  const install = useCallback(async () => {
    if (!status.installPrompt) return false;

    try {
      await status.installPrompt.prompt();
      const { outcome } = await status.installPrompt.userChoice;
      
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
      console.error('Install error:', error);
      return false;
    }
  }, [status.installPrompt]);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update check error:', error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage('skipWaiting');
          window.location.reload();
        }
      });
    }
  }, []);

  return {
    ...status,
    install,
    checkForUpdates,
    applyUpdate,
  };
}
