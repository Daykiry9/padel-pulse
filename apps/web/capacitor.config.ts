import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.padelking.app',
  appName: 'PadelKing',
  // webDir es ignorado cuando usamos server.url, pero Capacitor lo exige.
  webDir: 'public',
  // Token en el User-Agent para que el server distinga app nativa de web.
  appendUserAgent: 'PadelKingApp',
  server: {
    // Modo wrapper: la app nativa carga el sitio en producción.
    url: 'https://padelking.co',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0a0a',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#0a0a0a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
