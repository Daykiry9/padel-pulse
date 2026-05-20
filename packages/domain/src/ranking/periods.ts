import type { RankingPeriod } from '../types';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Devuelve el rango [start, end) para el periodo de ranking dado.
 * `reference` define el "ahora" (default: new Date()).
 */
export function getPeriodRange(period: RankingPeriod, reference: Date = new Date()): PeriodRange {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();

  switch (period) {
    case 'monthly': {
      const start = new Date(Date.UTC(y, m, 1));
      const end = new Date(Date.UTC(y, m + 1, 1));
      return { start, end, label: `${y}-${String(m + 1).padStart(2, '0')}` };
    }
    case 'quarterly': {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(Date.UTC(y, qStartMonth, 1));
      const end = new Date(Date.UTC(y, qStartMonth + 3, 1));
      const q = Math.floor(qStartMonth / 3) + 1;
      return { start, end, label: `${y}-Q${q}` };
    }
    case 'semestral': {
      const sStartMonth = m < 6 ? 0 : 6;
      const start = new Date(Date.UTC(y, sStartMonth, 1));
      const end = new Date(Date.UTC(y, sStartMonth + 6, 1));
      const s = sStartMonth === 0 ? 1 : 2;
      return { start, end, label: `${y}-S${s}` };
    }
    case 'annual': {
      const start = new Date(Date.UTC(y, 0, 1));
      const end = new Date(Date.UTC(y + 1, 0, 1));
      return { start, end, label: `${y}` };
    }
    case 'all_time': {
      return {
        start: new Date(Date.UTC(2020, 0, 1)),
        end: new Date(Date.UTC(y + 10, 0, 1)),
        label: 'all-time',
      };
    }
  }
}

export const RANKING_PERIODS: RankingPeriod[] = [
  'monthly',
  'quarterly',
  'semestral',
  'annual',
  'all_time',
];
