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
      `¿Cerrar inscripciones y generar el bracket con ${count} equipos? Esta acción se puede revertir pero borrará los matches actuales.`,
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
      <Button variant="crown" size="lg" onClick={onClick} disabled={busy}>
        <Sparkles className="size-4" />
        {busy ? 'Generando bracket…' : 'Cerrar y generar bracket'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
