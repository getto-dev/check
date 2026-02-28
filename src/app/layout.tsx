import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

// basePath для GitHub Pages
const basePath = process.env.NODE_ENV === 'production' ? '/check' : '';

export const metadata: Metadata = {
  title: "СантехСчет - Калькулятор смет",
  description: "Профессиональный калькулятор для расчёта смет на сантехнические работы. Отопление, водоснабжение, канализация и многое другое.",
  keywords: ["смета", "сантехника", "калькулятор", "отопление", "водоснабжение", "канализация", "расчёт стоимости"],
  authors: [{ name: "СантехСчет" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "СантехСчет",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8b5cf6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="СантехСчет" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="СантехСчет" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Manifest */}
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        
        {/* Favicon */}
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/icons/favicon-16x16.png`} />
        <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/icons/favicon-32x32.png`} />
        
        {/* iOS Icons */}
        <link rel="apple-touch-icon" href={`${basePath}/icons/apple-touch-icon.png`} />
        <link rel="apple-touch-icon" sizes="152x152" href={`${basePath}/icons/ios/152x152.png`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/icons/apple-touch-icon.png`} />
        <link rel="apple-touch-icon" sizes="167x167" href={`${basePath}/icons/ios/167x167.png`} />
        
        {/* Android Chrome */}
        <link rel="icon" type="image/png" sizes="192x192" href={`${basePath}/icons/android/android-192x192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${basePath}/icons/android/android-512x512.png`} />
        
        {/* Windows */}
        <meta name="msapplication-config" content={`${basePath}/browserconfig.xml`} />
        
        {/* Register Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var basePath = '${basePath}' || '';
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register(basePath + '/sw.js', { scope: basePath + '/' }).then(
                      function(registration) {
                        console.log('SW registered: ', registration.scope);
                      },
                      function(err) {
                        console.log('SW registration failed: ', err);
                      }
                    );
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
