/**
 * Motivos ofrecidos al denunciar. El valor viaja tal cual a la DB.
 *
 * Vive fuera de `moderation-actions.ts` porque ese archivo es `'use server'` y
 * Next.js solo permite exportar funciones async desde un modulo de server
 * actions. Tenerlo alla rompia la pagina del torneo en dev con
 * "A 'use server' file can only export async functions, found object".
 */
export const REPORT_REASONS = [
  'Lenguaje ofensivo o insultos',
  'Acoso o amenazas',
  'Spam o publicidad',
  'Contenido sexual o inapropiado',
  'Suplantación de identidad',
  'Otro',
] as const;
