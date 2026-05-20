import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Padel Pulse — Comunidades y torneos americanos de pádel en Colombia',
    template: '%s · Padel Pulse',
  },
  description:
    'Crea tu parche, inscríbelo a torneos americanos, sube en el ranking de comunidades y lleva el pádel colombiano al siguiente nivel.',
  metadataBase: new URL('https://padelpulse.co'),
  keywords: [
    'pádel',
    'padel colombia',
    'torneos americanos',
    'comunidades pádel',
    'ranking pádel bogotá',
  ],
  openGraph: {
    title: 'Padel Pulse — el pulso del pádel en Colombia',
    description:
      'Crea tu parche, inscríbelo a torneos americanos y compite por el ranking nacional de comunidades.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Padel Pulse',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Padel Pulse',
    description: 'El pulso del pádel colombiano.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a715c' },
    { media: '(prefers-color-scheme: dark)', color: '#042a24' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
