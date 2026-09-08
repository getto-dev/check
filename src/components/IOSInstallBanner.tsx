'use client';

import { Share2, X } from 'lucide-react';
import { useState } from 'react';

export function IOSInstallBanner({ isStandalone, isInstalled }: { isStandalone: boolean; isInstalled: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const ios = /iPhone|iPad|iPod/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent);
  if (!ios || isStandalone || isInstalled || dismissed) return null;

  return <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-card border border-border shadow-xl p-3 flex items-center gap-3">
    <Share2 className="w-5 h-5 text-primary" aria-hidden="true" />
    <div className="flex-1 text-xs">В Safari нажмите «Поделиться», затем «На экран Домой».</div>
    <button type="button" onClick={() => setDismissed(true)} className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring" aria-label="Закрыть"><X className="w-4 h-4" aria-hidden="true" /></button>
  </div>;
}
