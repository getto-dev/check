'use client';

import { memo, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ThemeMode } from '@/lib/types';
import { APP_VERSION } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor, Download, RefreshCw, MessageCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

const ThemeButton = memo(function ThemeButton({
  mode,
  currentMode,
  onClick,
  icon: Icon,
  label,
}: {
  mode: ThemeMode;
  currentMode: ThemeMode;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  const isActive = mode === currentMode;

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3.5 sm:p-4 rounded-xl text-center border-2 transition-all touch-manipulation',
        isActive
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary active:scale-95'
      )}
      aria-pressed={isActive}
    >
      <Icon
        className={cn(
          'w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
        {label}
      </span>
    </button>
  );
});

export const SettingsSection = memo(function SettingsSection() {
  const { settings, updateSettings, themeMode, setThemeMode } = useAppStore();
  const { setTheme } = useTheme();
  const { isInstalled, canInstall, needsUpdate, install, checkForUpdates, applyUpdate } = usePWA();
  const { showToast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setTheme(themeMode);
  }, [themeMode, setTheme]);

  const handleThemeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, [setThemeMode]);

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ address: e.target.value });
  }, [updateSettings]);

  const handleDiscountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ discount: parseInt(e.target.value) || 0 });
  }, [updateSettings]);

  const handleCheckUpdates = useCallback(async () => {
    setIsChecking(true);
    const hasUpdate = await checkForUpdates();
    setIsChecking(false);

    if (!hasUpdate) {
      showToast('Обновлений нет', 'info');
    }
  }, [checkForUpdates, showToast]);

  const handleInstall = useCallback(async () => {
    if (!canInstall) {
      // If install is not available, show instructions
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);
      
      if (isAndroid && isChrome) {
        showToast('Нажмите ⋮ → "Установить приложение"', 'info');
      } else {
        showToast('Используйте Chrome на Android или Safari на iOS', 'info');
      }
      return;
    }
    
    const success = await install();
    if (!success) {
      // User dismissed the install dialog
      console.log('Install dismissed by user');
    }
  }, [install, canInstall, showToast]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-extrabold pb-3 border-b border-border">
        Настройки
      </h2>

      <div className="space-y-2">
        <label
          htmlFor="address"
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block"
        >
          Адрес объекта
        </label>
        <input
          id="address"
          type="text"
          value={settings.address}
          onChange={handleAddressChange}
          placeholder="г. Москва, ул. Строителей, д. 10"
          className={cn(
            'w-full px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl text-sm',
            'bg-card border-2 border-border',
            'focus:outline-none focus:border-primary transition-colors',
            'touch-manipulation'
          )}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="discount"
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block"
        >
          Скидка на услуги
        </label>
        <div className="bg-muted rounded-xl p-3.5 sm:p-4">
          <input
            id="discount"
            type="range"
            value={settings.discount}
            onChange={handleDiscountChange}
            min={0}
            max={50}
            step={5}
            className="w-full h-2 rounded-full appearance-none bg-border cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:sm:w-7 [&::-webkit-slider-thumb]:sm:h-7
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:gradient-bg
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-primary/40
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:gradient-bg
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between mt-2.5 text-xs font-bold text-muted-foreground">
            <span>0%</span>
            <span className="text-base sm:text-lg gradient-text">
              {settings.discount}%
            </span>
            <span>50%</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
          Тема
        </span>
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5" role="radiogroup" aria-label="Выбор темы">
          <ThemeButton
            mode="light"
            currentMode={themeMode}
            onClick={() => handleThemeChange('light')}
            icon={Sun}
            label="Светлая"
          />
          <ThemeButton
            mode="dark"
            currentMode={themeMode}
            onClick={() => handleThemeChange('dark')}
            icon={Moon}
            label="Тёмная"
          />
          <ThemeButton
            mode="system"
            currentMode={themeMode}
            onClick={() => handleThemeChange('system')}
            icon={Monitor}
            label="Система"
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
          Приложение
        </span>
        <div className="flex flex-col gap-2.5">
          <Button
            variant="outline"
            onClick={needsUpdate ? applyUpdate : handleCheckUpdates}
            disabled={isChecking}
            className={cn(
              'w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold justify-start gap-3',
              'border-2 border-border bg-card',
              'hover:border-primary hover:bg-primary/5 transition-all touch-manipulation',
              needsUpdate && 'border-green-500 text-green-600 hover:bg-green-50'
            )}
          >
            <RefreshCw className={cn('w-5 h-5', isChecking && 'animate-spin')} />
            <span>
              {isChecking ? 'Проверка...' : needsUpdate ? 'Применить обновление' : 'Проверить обновления'}
            </span>
          </Button>

          {!isInstalled && (
            <Button
              variant="outline"
              onClick={handleInstall}
              className={cn(
                'w-full py-3 sm:py-3.5 rounded-xl text-sm font-bold justify-start gap-3',
                'border-2 border-border bg-card',
                'hover:border-primary hover:bg-primary/5 transition-all touch-manipulation',
                canInstall && 'gradient-bg text-white border-transparent hover:shadow-lg'
              )}
            >
              <Download className="w-5 h-5" />
              <span>{canInstall ? 'Установить приложение' : 'Как установить приложение'}</span>
            </Button>
          )}

          {isInstalled && (
            <div className="text-xs text-center text-muted-foreground py-2">
              ✓ Приложение установлено
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block">
          Связь с нами
        </span>
        <a
          href="tg://resolve?domain=gettocode"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 w-full py-3 sm:py-3.5 px-4 rounded-xl text-sm font-bold',
            'border-2 border-border bg-card',
            'hover:border-primary hover:bg-primary/5 transition-all touch-manipulation'
          )}
        >
          <MessageCircle className="w-5 h-5 text-primary" />
          <span>Telegram</span>
        </a>
      </div>

      <footer className="text-center pt-5 sm:pt-6 text-[10px] sm:text-[11px] text-muted-foreground/60">
        Getto-Dev v{APP_VERSION} • 2026
      </footer>
    </div>
  );
});
