'use client';

import { Download, X } from 'lucide-react';
import { useState } from 'react';

export function InstallBanner({ onInstall, canInstall, isInstalled }: { onInstall: () => Promise<unknown>; canInstall: boolean; isInstalled: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (!canInstall || isInstalled || dismissed) return null;

  return <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-card border border-border shadow-xl p-3 flex items-center gap-3">
    <Download className="w-5 h-5 text-primary" aria-hidden="true" />
    <div className="flex-1 text-sm"><strong>Установить СантехСчёт</strong><div className="text-xs text-muted-foreground">Для работы офлайн и быстрого запуска</div></div>
    <button type="button" onClick={() => void onInstall()} className="button primary focus-visible:ring-2 focus-visible:ring-ring">Установить</button>
    <button type="button" onClick={() => setDismissed(true)} className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring" aria-label="Закрыть"><X className="w-4 h-4" aria-hidden="true" /></button>
  </div>;
}
