import type { Metadata, Viewport } from 'next';
import { Archivo_Black, JetBrains_Mono, Manrope } from 'next/font/google';

import { MobileNav } from '@/components/mobile-nav';
import { getBrandFromCookie } from '@/lib/brand';
import { isNativeApp } from '@/lib/native';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

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
  applicationName: 'PadelKing',
  manifest: '/manifest.json',
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
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'PadelKing',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'PadelKing — la liga amateur del pádel colombiano',
    description:
      'Equipos, comunidades, clubes y rankings. PadelKing para masculino y mixto, PadelQueens para femenino. Inspiración Kings League, identidad propia.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'PadelKing',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'PadelKing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadelKing',
    description: 'La liga amateur del pádel colombiano.',
    images: ['/icons/icon-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [brand, native, user] = await Promise.all([
    getBrandFromCookie(),
    isNativeApp(),
    getSession(),
  ]);

  let isSuperAdmin = false;
  if (user) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();
    isSuperAdmin = (data as { is_super_admin: boolean } | null)?.is_super_admin === true;
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${archivoBlack.variable} ${manrope.variable} ${jetbrainsMono.variable} antialiased ${brand === 'queens' ? 'theme-queens' : ''} ${native ? 'native-app' : ''}`}
      >
        {children}
        <MobileNav isNative={native} isAuthed={Boolean(user)} isSuperAdmin={isSuperAdmin} />
      </body>
    </html>
  );
}
