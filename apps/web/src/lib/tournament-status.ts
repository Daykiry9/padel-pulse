import type { BadgeProps } from '@/components/ui/badge';

/**
 * Traducción + variante visual del status de torneo, compartida por la vista
 * pública, la de comunidad y manage para que las tres hablen igual.
 */
export const TOURNAMENT_STATUS: Record<
  string,
  { label: string; variant: NonNullable<BadgeProps['variant']> }
> = {
  open: { label: 'Inscripciones abiertas', variant: 'success' },
  in_progress: { label: 'En curso', variant: 'live' },
  finished: { label: 'Finalizado', variant: 'muted' },
  cancelled: { label: 'Cancelado', variant: 'muted' },
};
