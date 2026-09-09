import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/components/ui/toast';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/check' : '');

export const metadata: Metadata = {
  title: 'Smeta — калькулятор смет',
  description: 'Offline-first калькулятор смет для разных профессий',
  applicationName: 'Smeta',
  manifest: `${basePath}/manifest.json`,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2388c9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sw = `${basePath}/sw.js`;

  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </ToastProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('${sw}',{scope:'${basePath || '/'}'}).catch(()=>{}));`,
          }}
        />
      </body>
    </html>
  );
}
