import { headers } from 'next/headers';

/**
 * Detecta si el request viene del wrapper Capacitor (app nativa) en vez
 * de un browser web. Capacitor inyecta `PadelKingApp` en el User-Agent
 * via `appendUserAgent` en capacitor.config.ts.
 */
export async function isNativeApp(): Promise<boolean> {
  const h = await headers();
  return (h.get('user-agent') ?? '').includes('PadelKingApp');
}
