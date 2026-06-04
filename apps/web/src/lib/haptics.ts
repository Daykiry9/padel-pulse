/**
 * Wrapper de Capacitor Haptics.
 * - En web: no-op.
 * - En native: ejecuta el feedback haptico correspondiente.
 * - Importa @capacitor/haptics dinamicamente para no romper SSR/web build.
 */

type ImpactOptions = { style: 'Light' | 'Medium' | 'Heavy' };
type NotifyOptions = { type: 'Success' | 'Warning' | 'Error' };

async function isNative(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function impact(style: ImpactOptions['style']): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[style] });
  } catch {
    // Haptics no disponible: silencioso.
  }
}

async function notify(type: NotifyOptions['type']): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType[type] });
  } catch {
    // Haptics no disponible: silencioso.
  }
}

export async function tap(): Promise<void> {
  await impact('Light');
}

export async function confirm(): Promise<void> {
  await impact('Medium');
}

export async function success(): Promise<void> {
  await notify('Success');
}

export async function error(): Promise<void> {
  await notify('Error');
}

export async function matchPoint(): Promise<void> {
  await notify('Warning');
}
