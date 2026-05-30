'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { closeRegistrationsAndGenerateBracket } from '@/lib/tournament-actions';

export function GenerateBracketButton({
  tournamentId,
  count,
}: {
  tournamentId: string;
  count: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const ok = window.confirm(
      `¿Iniciar el torneo con ${count} inscritos? Se cerrarán las inscripciones y se generará el bracket. Si lo vuelves a iniciar, se borrarán los matches actuales.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('tournament_id', tournamentId);
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
    <div className="space-y-2">
      <Button variant="crown" size="sm" onClick={onClick} disabled={busy}>
        <Sparkles className="size-3" />
        {busy ? 'Iniciando…' : 'Iniciar torneo ya'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
