/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type WorkerCleanup = () => void;

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
    const workerCleanups: WorkerCleanup[] = [];

    const monitorWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const onStateChange = () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaiting(worker);
          setNeedsUpdate(true);
        }
      };
      worker.addEventListener('statechange', onStateChange);
      workerCleanups.push(() => worker.removeEventListener('statechange', onStateChange));
    };

    const setupServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

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

    const controllerChange = () => {
      setWaiting(null);
      setNeedsUpdate(false);
      window.location.reload();
    };
    window.addEventListener('controllerchange', controllerChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      if (registration && updateFound) registration.removeEventListener('updatefound', updateFound);
      workerCleanups.forEach((cleanup) => cleanup());
      window.removeEventListener('controllerchange', controllerChange);
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

    const existingWaiting = registration.waiting;
    if (existingWaiting) {
      setWaiting(existingWaiting);
      setNeedsUpdate(true);
      return true;
    }

    const installing = await new Promise<ServiceWorker | null>((resolve) => {
      let resolved = false;
      let cleanup = () => {};

      const finish = (worker: ServiceWorker | null) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(worker);
      };

      const onStateChange = () => {
        const worker = registration.waiting ?? registration.installing;
        if (registration.waiting) {
          finish(registration.waiting);
        } else if (worker?.state === 'installed') {
          finish(worker);
        }
      };

      const onUpdateFound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', onStateChange);
        cleanup = () => worker.removeEventListener('statechange', onStateChange);
      };

      registration.addEventListener('updatefound', onUpdateFound, { once: true });
      cleanup = () => registration.removeEventListener('updatefound', onUpdateFound);
      void registration.update()
        .then(() => {
          if (registration.waiting) finish(registration.waiting);
          else if (!registration.installing) finish(null);
        })
        .catch(() => finish(null));
    });

    if (installing && installing.state === 'installed' && navigator.serviceWorker.controller) {
      setWaiting(installing);
      setNeedsUpdate(true);
      return true;
    }
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
