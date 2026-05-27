'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { finishTournament } from '@/lib/tournament-actions';

/** Botón del organizador para cerrar el torneo (inline en la vista en vivo). */
export function FinishTournamentButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tournament_id', tournamentId);
      const r = await finishTournament(fd);
      if (!r.ok) return setError(r.error ?? 'Error');
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        <Trophy className="size-3" />
        Finalizar torneo
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs normal-case">
        ¿Finalizar el torneo? Queda marcado como terminado.
      </span>
      <Button size="sm" variant="crown" onClick={finish} disabled={isPending}>
        {isPending ? '…' : 'Sí, finalizar'}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
        Cancelar
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  );
}
