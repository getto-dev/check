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
    const standalone = matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
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

    let registration: ServiceWorkerRegistration | undefined;
    let updateFound: (() => void) | undefined;
    let controllerChange: (() => void) | undefined;

    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        const monitorWorker = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaiting(worker);
              setNeedsUpdate(true);
            }
          });
        };

        updateFound = () => monitorWorker(registration?.installing ?? null);
        registration.addEventListener('updatefound', updateFound);
        monitorWorker(registration.waiting);
        if (registration.waiting) {
          setWaiting(registration.waiting);
          setNeedsUpdate(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void setupServiceWorker();

    controllerChange = () => {
      setWaiting(null);
      setNeedsUpdate(false);
      window.location.reload();
    };
    window.addEventListener('controllerchange', controllerChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      if (registration && updateFound) registration.removeEventListener('updatefound', updateFound);
      if (controllerChange) window.removeEventListener('controllerchange', controllerChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error(error);
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
