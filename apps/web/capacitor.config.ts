import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.padelking.app',
  appName: 'PadelKing',
  // webDir es ignorado cuando usamos server.url, pero Capacitor lo exige.
  // El public folder existe y sirve como placeholder.
  webDir: 'public',
  server: {
    // Modo wrapper: la app nativa carga el sitio en producción.
    // Cuando salgas a stores, cambia esto al dominio final (padelking.co).
    url: 'https://padel-pulse-9qwu4cs9l-juanesvgarcia-2425s-projects.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
