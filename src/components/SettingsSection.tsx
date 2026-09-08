'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ThemeMode } from '@/lib/types';
import { APP_VERSION, MAX_DISCOUNT_PERCENT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Download, RefreshCw, MessageCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export const SettingsSection = memo(function SettingsSection() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const { setTheme } = useTheme();
  const { isInstalled, canInstall, needsUpdate, install, checkForUpdates, applyUpdate } = usePWA();
  const { showToast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => setTheme(themeMode), [themeMode, setTheme]);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      const updated = await checkForUpdates();
      if (!updated) showToast('Обновлений нет', 'info');
    } catch (error) {
      console.error(error);
      showToast('Не удалось проверить обновления', 'error');
    } finally {
      setIsChecking(false);
    }
  }, [checkForUpdates, showToast]);

  const installApp = useCallback(async () => {
    if (!canInstall) {
      showToast('Используйте Chrome на Android или Safari на iOS', 'info');
      return;
    }
    await install();
  }, [canInstall, install, showToast]);

  return <div className="space-y-5 sm:space-y-6">
    <h2 className="text-lg sm:text-xl font-extrabold pb-3 border-b border-border">Настройки</h2>
    <div className="space-y-2">
      <label htmlFor="address" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Адрес объекта</label>
      <input id="address" type="text" value={settings.address} onChange={(event) => updateSettings({ address: event.target.value })} placeholder="г. Москва, ул. Строителей, д. 10" className="w-full px-4 py-3.5 rounded-xl text-sm bg-card border-2 border-border focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
    <div className="space-y-2">
      <label htmlFor="discount" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Скидка на услуги</label>
      <div className="bg-muted rounded-xl p-4">
        <input id="discount" type="range" value={settings.discountPercent} onChange={(event) => updateSettings({ discountPercent: Math.max(0, Math.min(MAX_DISCOUNT_PERCENT, Number(event.target.value))) })} min={0} max={MAX_DISCOUNT_PERCENT} step={5} className="w-full" aria-valuemin={0} aria-valuemax={MAX_DISCOUNT_PERCENT} aria-valuenow={settings.discountPercent} />
        <div className="flex justify-between mt-2.5 text-xs font-bold text-muted-foreground"><span>0%</span><span className="text-lg gradient-text">{settings.discountPercent}%</span><span>{MAX_DISCOUNT_PERCENT}%</span></div>
      </div>
    </div>
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Тема</span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Тема оформления">
        {([['light', Sun, 'Светлая'], ['dark', Moon, 'Тёмная'], ['system', Monitor, 'Система']] as const).map(([mode, Icon, label]) => <button key={mode} type="button" onClick={() => setThemeMode(mode as ThemeMode)} className={cn('p-4 rounded-xl text-center border-2 focus-visible:ring-2 focus-visible:ring-ring', themeMode === mode ? 'border-primary bg-primary/10' : 'border-border bg-card')} aria-pressed={themeMode === mode}><Icon className="w-6 h-6 mx-auto mb-2" /><span className="text-[11px] font-bold">{label}</span></button>)}
      </div>
    </div>
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">Приложение</span>
      <div className="flex flex-col gap-2.5">
        <Button variant="outline" onClick={needsUpdate ? applyUpdate : check} disabled={isChecking} className="w-full justify-start gap-3 py-3.5 rounded-xl"><RefreshCw className={cn('w-5 h-5', isChecking && 'animate-spin')} />{isChecking ? 'Проверка...' : needsUpdate ? 'Применить обновление' : 'Проверить обновления'}</Button>
        {!isInstalled ? <Button variant="outline" onClick={installApp} className={cn('w-full justify-start gap-3 py-3.5 rounded-xl', canInstall && 'gradient-bg text-white')}><Download className="w-5 h-5" />{canInstall ? 'Установить приложение' : 'Как установить приложение'}</Button> : <div className="text-xs text-center text-muted-foreground py-2">✓ Приложение установлено</div>}
      </div>
    </div>
    <a href="tg://resolve?domain=gettocode" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full py-3.5 px-4 rounded-xl text-sm font-bold border-2 border-border bg-card focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="w-5 h-5 text-primary" />Telegram</a>
    <footer className="text-center pt-6 text-[11px] text-muted-foreground/60">Getto-Dev v{APP_VERSION} • 2026</footer>
  </div>;
});
