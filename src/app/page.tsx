'use client';

import { useCallback } from 'react';
import { useAppStore, haptic } from '@/lib/store';
import { usePWA } from '@/hooks/use-pwa';
import { Header } from '@/components/Header';
import { SearchSection } from '@/components/SearchSection';
import { CatalogList } from '@/components/CatalogList';
import { InvoiceSection } from '@/components/InvoiceSection';
import { ManualSection } from '@/components/ManualSection';
import { SettingsSection } from '@/components/SettingsSection';
import { AddItemModal } from '@/components/AddItemModal';
import { InstallBanner } from '@/components/InstallBanner';
import { IOSInstallBanner } from '@/components/IOSInstallBanner';

const CONTENT_WIDTHS = {
  catalog: 'max-w-5xl',
  invoice: 'max-w-3xl',
  manual: 'max-w-2xl',
  settings: 'max-w-2xl',
} as const;

export default function HomePage() {
  const { currentTab, setTab } = useAppStore();
  const { canInstall, isStandalone, isInstalled, install } = usePWA();

  const handleManualClick = useCallback(() => {
    setTab('manual');
    haptic('light');
  }, [setTab]);

  const renderContent = () => {
    switch (currentTab) {
      case 'catalog':
        return (
          <>
            <SearchSection onManualClick={handleManualClick} />
            <section
              className="flex-1 px-3 sm:px-4 pb-4 sm:pb-6 mx-auto w-full overflow-y-auto scrollbar-thin"
              aria-label="Каталог услуг"
            >
              <CatalogList />
            </section>
          </>
        );
      case 'invoice':
        return (
          <section
            className="flex-1 px-3 sm:px-4 pb-4 sm:pb-6 mx-auto w-full"
            aria-label="Смета"
          >
            <InvoiceSection />
          </section>
        );
      case 'manual':
        return (
          <section
            className="flex-1 px-3 sm:px-4 pb-4 sm:pb-6 mx-auto w-full"
            aria-label="Ручное добавление"
          >
            <ManualSection />
          </section>
        );
      case 'settings':
        return (
          <section
            className="flex-1 px-3 sm:px-4 pb-4 sm:pb-6 mx-auto w-full"
            aria-label="Настройки"
          >
            <SettingsSection />
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main
        className={`flex-1 flex flex-col mx-auto w-full ${CONTENT_WIDTHS[currentTab] ?? 'max-w-5xl'}`}
      >
        {renderContent()}
      </main>
      <AddItemModal />
      
      {/* PWA Install Banners */}
      <InstallBanner
        onInstall={install}
        canInstall={canInstall}
        isInstalled={isInstalled}
      />
      <IOSInstallBanner
        isStandalone={isStandalone}
        isInstalled={isInstalled}
      />
    </div>
  );
}
