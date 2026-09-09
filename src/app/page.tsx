'use client';

import { useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchSection } from '@/components/SearchSection';
import { CatalogList } from '@/components/CatalogList';
import { InvoiceSection } from '@/components/InvoiceSection';
import { ManualSection } from '@/components/ManualSection';
import { SettingsSection } from '@/components/SettingsSection';
import { AddItemModal } from '@/components/AddItemModal';
import { InstallBanner } from '@/components/InstallBanner';
import { IOSInstallBanner } from '@/components/IOSInstallBanner';
import { MobileNavigation } from '@/components/MobileNavigation';
import { useAppStore } from '@/lib/store';
import { usePWA } from '@/hooks/use-pwa';
import { useProfessionDataset } from '@/lib/use-dataset';

export default function HomePage() {
  const currentTab = useAppStore((state) => state.currentTab);
  const setTab = useAppStore((state) => state.setTab);
  const pwa = usePWA();
  const dataset = useProfessionDataset();

  const content = useMemo(() => {
    switch (currentTab) {
      case 'invoice':
        return <InvoiceSection />;
      case 'manual':
        return <ManualSection />;
      case 'settings':
        return <SettingsSection {...pwa} />;
      default:
        return <>
          <SearchSection categories={dataset.categories} onManualClick={() => setTab('manual')} />
          <section className="flex-1 px-3 sm:px-4 pb-6 sm:pb-8 mx-auto w-full max-w-5xl overflow-y-auto">
            {dataset.loading && !dataset.catalogItems.length ? (
              <div className="py-16 text-center text-muted-foreground">Загрузка каталога…</div>
            ) : dataset.error && !dataset.catalogItems.length ? (
              <div className="py-16 text-center text-muted-foreground">
                <p>Не удалось загрузить каталог.</p>
                <p className="mt-2 text-xs">Откройте приложение с интернетом один раз, чтобы сохранить каталог для работы offline.</p>
              </div>
            ) : (
              <CatalogList catalogItems={dataset.catalogItems} categories={dataset.categories} />
            )}
          </section>
        </>;
    }
  }, [currentTab, dataset.catalogItems, dataset.categories, dataset.error, dataset.loading, pwa, setTab]);

  return <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 flex flex-col mx-auto w-full max-w-5xl pb-32 sm:pb-0">{content}</main>
    <AddItemModal />
    <InstallBanner onInstall={pwa.install} canInstall={pwa.canInstall} isInstalled={pwa.isInstalled} />
    <IOSInstallBanner isStandalone={pwa.isStandalone} isInstalled={pwa.isInstalled} />
    <MobileNavigation />
  </div>;
}
