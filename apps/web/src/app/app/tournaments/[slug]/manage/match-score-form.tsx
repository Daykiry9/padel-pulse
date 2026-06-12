'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Gavel } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forceCompleteMatch, reportMatchScore } from '@/lib/tournament-actions';

export function MatchScoreForm({
  matchId,
  labelOne,
  labelTwo,
  initialScoreOne,
  initialScoreTwo,
  status = 'scheduled',
  reportedByLabel,
}: {
  matchId: string;
  labelOne: string;
  labelTwo: string;
  initialScoreOne: number | null;
  initialScoreTwo: number | null;
  status?: string;
  /** Nombre de la pareja que reportó (para pending_confirmation). */
  reportedByLabel?: string | null;
}) {
  const router = useRouter();
  const [scoreOne, setScoreOne] = useState<string>(initialScoreOne?.toString() ?? '');
  const [scoreTwo, setScoreTwo] = useState<string>(initialScoreTwo?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPendingConfirm = status === 'pending_confirmation';
  const isDisputed = status === 'disputed';

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('match_id', matchId);
      fd.set('score_one', scoreOne);
      fd.set('score_two', scoreTwo);
      const result = await reportMatchScore(fd);
      if (!result.ok) {
        setError(result.error ?? 'Error');
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function forceClose() {
    setError(null);
    startTransition(async () => {
      const result = await forceCompleteMatch(matchId);
      if (!result.ok) {
        setError(result.error ?? 'Error');
        return;
      }
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {(isPendingConfirm || isDisputed) && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            isDisputed
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-crown/40 bg-crown/10 text-crown'
          }`}
        >
          {isDisputed
            ? 'En disputa: las parejas no coinciden. Define el marcador correcto y cierra.'
            : `${reportedByLabel ?? 'Una pareja'} reportó este marcador. Acéptalo o corrígelo.`}
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <span className="text-foreground text-sm font-medium">{labelOne}</span>
        <Input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          className="w-16 text-center font-display text-lg"
          value={scoreOne}
          onChange={(e) => setScoreOne(e.target.value)}
          aria-label={`Marcador de ${labelOne}`}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <span className="text-foreground text-sm font-medium">{labelTwo}</span>
        <Input
          type="number"
          min={0}
          max={99}
          inputMode="numeric"
          className="w-16 text-center font-display text-lg"
          value={scoreTwo}
          onChange={(e) => setScoreTwo(e.target.value)}
          aria-label={`Marcador de ${labelTwo}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="crown" onClick={submit} disabled={isPending}>
          <Check className="size-3" />
          {isPending ? 'Guardando…' : isPendingConfirm || isDisputed ? 'Cerrar con este marcador' : 'Guardar y cerrar'}
        </Button>
        {isPendingConfirm && (
          <Button size="sm" variant="outline" onClick={forceClose} disabled={isPending}>
            <Gavel className="size-3" />
            Aceptar lo reportado
          </Button>
        )}
        {savedAt && !isPending && (
          <span className="text-success flex items-center gap-1 text-xs">
            <Check className="size-3 shrink-0" aria-hidden />
            Guardado
          </span>
        )}
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}
