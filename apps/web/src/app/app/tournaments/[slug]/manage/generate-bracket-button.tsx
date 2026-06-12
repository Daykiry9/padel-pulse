'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { closeRegistrationsAndGenerateBracket } from '@/lib/tournament-actions';

// Jugadores por cancha según formato: random/express son individuales (4),
// el resto son parejas (2 parejas por cancha).
const PER_COURT: Record<string, number> = {
  americano_random: 4,
  express: 4,
};

export function GenerateBracketButton({
  tournamentId,
  count,
  format,
}: {
  tournamentId: string;
  count: number;
  format: string;
}) {
  const perCourt = PER_COURT[format] ?? 2;
  const maxCourts = Math.max(1, Math.floor(count / perCourt));
  const [courts, setCourts] = useState(maxCourts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const ok = window.confirm(
      `¿Iniciar el torneo con ${count} inscritos en ${courts} cancha${courts > 1 ? 's' : ''}? Se cerrarán las inscripciones y se generará el bracket. Si lo vuelves a iniciar, se borrarán los matches actuales.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('tournament_id', tournamentId);
    fd.set('courts', String(courts));
    const result = await closeRegistrationsAndGenerateBracket(fd);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Error inesperado');
      return;
    }
    // El revalidatePath del action refresca la página.
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      {/* div, no label: el Select custom renderiza sus opciones dentro del
          contenedor y un label re-dispararía el click al trigger (reabre el popup) */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Canchas</span>
        <Select
          className="w-20"
          value={String(courts)}
          onChange={(e) => setCourts(Number(e.target.value))}
          disabled={busy}
        >
          {Array.from({ length: maxCourts }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </Select>
        <span className="text-muted-foreground text-xs">
          máx {maxCourts} para {count} inscritos
        </span>
      </div>
      <Button variant="crown" size="sm" onClick={onClick} disabled={busy}>
        <Sparkles className="size-3" />
        {busy ? 'Iniciando…' : 'Iniciar torneo ya'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
