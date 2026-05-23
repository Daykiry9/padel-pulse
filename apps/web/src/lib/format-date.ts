/**
 * Formatos de fecha/hora SIEMPRE en zona horaria Colombia (America/Bogota).
 * Esto evita que el render del servidor (UTC en Vercel) se desincronice del
 * cliente (zona local) y muestre horas incorrectas como "01:09 a.m." cuando
 * realmente son "8:00 p.m." en BOG.
 */

const TZ = 'America/Bogota';

export function formatDate(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short' },
): string {
  return new Date(date).toLocaleDateString('es-CO', { ...opts, timeZone: TZ });
}

export function formatTime(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  return new Date(date).toLocaleTimeString('es-CO', { ...opts, timeZone: TZ });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

/** "vie · 24 may · 19:00" — short for compact card */
export function formatShort(date: string | Date): string {
  return (
    formatDate(date, { weekday: 'short', day: '2-digit', month: 'short' }) +
    ' · ' +
    formatTime(date)
  );
}
