'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Flag, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmMatchScore, reportMatchScore } from '@/lib/tournament-actions';

/**
 * Controles para un jugador participante de un partido (en la página en vivo):
 * - sin reporte → reportar marcador
 * - reportado por la otra pareja → confirmar o disputar
 * - reportado por mí → esperando confirmación
 * - disputado → el organizador resuelve
 */
export function PlayerMatchActions({
  matchId,
  status,
  mySide,
  reportedBySide,
  scoreOne,
  scoreTwo,
}: {
  matchId: string;
  status: string;
  mySide: 'one' | 'two';
  reportedBySide: 'one' | 'two' | null;
  scoreOne: number | null;
  scoreTwo: number | null;
}) {
  const router = useRouter();
  const [s1, setS1] = useState(scoreOne?.toString() ?? '');
  const [s2, setS2] = useState(scoreTwo?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status === 'completed') return null;

  function report() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('match_id', matchId);
      fd.set('score_one', s1);
      fd.set('score_two', s2);
      const r = await reportMatchScore(fd);
      if (!r.ok) return setError(r.error ?? 'Error');
      router.refresh();
    });
  }

  function confirm(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await confirmMatchScore(matchId, accept);
      if (!r.ok) return setError(r.error ?? 'Error');
      router.refresh();
    });
  }

  if (status === 'disputed') {
    return (
      <p className="text-destructive mt-2 text-[11px] normal-case">
        En disputa. El organizador definirá el marcador final.
      </p>
    );
  }

  // Pendiente y yo reporté → espero a la otra pareja.
  if (status === 'pending_confirmation' && reportedBySide === mySide) {
    return (
      <p className="text-crown mt-2 text-[11px] normal-case">
        Reportaste {scoreOne}–{scoreTwo}. Esperando que la otra pareja confirme.
      </p>
    );
  }

  // Pendiente y la otra pareja reportó → confirmo o disputo.
  if (status === 'pending_confirmation' && reportedBySide && reportedBySide !== mySide) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-muted-foreground text-[11px] normal-case">
          La otra pareja reportó <strong className="text-foreground">{scoreOne}–{scoreTwo}</strong>.
          ¿Es correcto?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="crown" onClick={() => confirm(true)} disabled={isPending}>
            <Check className="size-3" />
            Confirmar
          </Button>
          <Button size="sm" variant="outline" onClick={() => confirm(false)} disabled={isPending}>
            <X className="size-3" />
            Está mal
          </Button>
        </div>
        {error && <p className="text-destructive text-[11px]">{error}</p>}
      </div>
    );
  }

  // scheduled / sin reporte → reportar marcador.
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          className="h-9 w-14 text-center font-display"
          value={s1}
          onChange={(e) => setS1(e.target.value)}
          aria-label="Tu marcador"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          className="h-9 w-14 text-center font-display"
          value={s2}
          onChange={(e) => setS2(e.target.value)}
          aria-label="Marcador rival"
        />
        <Button size="sm" variant="crown" onClick={report} disabled={isPending}>
          <Flag className="size-3" />
          {isPending ? '…' : 'Reportar'}
        </Button>
      </div>
      {error && <p className="text-destructive text-[11px]">{error}</p>}
    </div>
  );
}
