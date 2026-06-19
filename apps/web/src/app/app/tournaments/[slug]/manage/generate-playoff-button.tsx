'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { generatePlayoffFromGroups } from '@/lib/tournament-actions';

export function GeneratePlayoffButton({ tournamentId }: { tournamentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (busy) return;
    const ok = window.confirm(
      '¿Generar el playoff con los clasificados de cada grupo? Se armará la llave de eliminación.',
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('tournament_id', tournamentId);
    const result = await generatePlayoffFromGroups(fd);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Error inesperado');
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <Button variant="crown" size="sm" onClick={onClick} disabled={busy}>
        <Sparkles className="size-3" />
        {busy ? 'Generando…' : 'Generar playoff'}
      </Button>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
