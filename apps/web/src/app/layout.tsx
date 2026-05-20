import type { Metadata, Viewport } from 'next';
import { Archivo_Black, JetBrains_Mono, Manrope } from 'next/font/google';

import './globals.css';

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PadelKing — comunidades, torneos y rankings del pádel colombiano',
    template: '%s · PadelKing',
  },
  description:
    'PadelKing & PadelQueens: la liga amateur del pádel colombiano. Crea tu equipo, juega torneos americanos y de eliminación, sube en el ranking por categoría.',
  metadataBase: new URL('https://padelking.co'),
  keywords: [
    'pádel',
    'padel colombia',
    'padel king',
    'padel queens',
    'torneos pádel',
    'liga pádel',
    'ranking pádel bogotá',
    'comunidades pádel',
  ],
  openGraph: {
    title: 'PadelKing — la liga amateur del pádel colombiano',
    description:
      'Equipos, comunidades, clubes y rankings. PadelKing para masculino y mixto, PadelQueens para femenino. Inspiración Kings League, identidad propia.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'PadelKing',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadelKing',
    description: 'La liga amateur del pádel colombiano.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${archivoBlack.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
