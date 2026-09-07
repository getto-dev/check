import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/checknew' : '');

export const metadata: Metadata = {
  title: 'СантехСчёт — калькулятор смет',
  description: 'Offline-first калькулятор смет на сантехнические работы',
  applicationName: 'СантехСчёт',
  manifest: `${basePath}/manifest.json`,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const swPath = `${basePath}/sw.js`;
  return <html lang="ru"><body>{children}<script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('${swPath}',{scope:'${basePath || '/'}' }).catch(()=>{}));` }} /></body></html>;
}
