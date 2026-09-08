/* eslint-disable react-hooks/set-state-in-effect */
'use client';
import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const installed = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);

    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      const updateFound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(worker);
            setNeedsUpdate(true);
          }
        });
      };

      registration.addEventListener('updatefound', updateFound);
      if (registration.waiting) {
        setWaiting(registration.waiting);
        setNeedsUpdate(true);
      }
    };

    void setupServiceWorker();

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      return outcome === 'accepted';
    } catch {
      setInstallPrompt(null);
      return false;
    }
  }, [installPrompt]);

  const checkForUpdates = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !navigator.onLine) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    await registration.update();
    if (registration.waiting) {
      setWaiting(registration.waiting);
      setNeedsUpdate(true);
      return true;
    }
    return false;
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    waiting.postMessage('skipWaiting');
    window.location.reload();
  }, [waiting]);

  return {
    canInstall: Boolean(installPrompt),
    install,
    isInstalled,
    isStandalone: isInstalled,
    needsUpdate,
    waitingWorker: waiting,
    checkForUpdates,
    applyUpdate,
  };
}
