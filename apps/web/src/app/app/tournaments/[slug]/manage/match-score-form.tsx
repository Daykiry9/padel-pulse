'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Gavel } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forceCompleteMatch, reportMatchScore } from '@/lib/tournament-actions';

type ScoringMode = 'points' | 'games' | 'sets';
type SetScore = { one: number; two: number };

export function MatchScoreForm({
  matchId,
  labelOne,
  labelTwo,
  initialScoreOne,
  initialScoreTwo,
  initialSetScores,
  status = 'scheduled',
  reportedByLabel,
  pointsPerMatch,
  scoringMode = 'points',
  numSets,
  gamesPerSet,
}: {
  matchId: string;
  labelOne: string;
  labelTwo: string;
  initialScoreOne: number | null;
  initialScoreTwo: number | null;
  initialSetScores?: SetScore[] | null;
  status?: string;
  /** Nombre de la pareja que reportó (para pending_confirmation). */
  reportedByLabel?: string | null;
  /** Puntos/games objetivo del torneo, como referencia al cargar. */
  pointsPerMatch?: number;
  scoringMode?: ScoringMode;
  numSets?: number | null;
  gamesPerSet?: number | null;
}) {
  const router = useRouter();
  const maxSets = scoringMode === 'sets' ? (numSets ?? 3) : 0;
  const [scoreOne, setScoreOne] = useState<string>(initialScoreOne?.toString() ?? '');
  const [scoreTwo, setScoreTwo] = useState<string>(initialScoreTwo?.toString() ?? '');
  const [sets, setSets] = useState<{ one: string; two: string }[]>(() =>
    Array.from({ length: maxSets }, (_, i) => ({
      one: initialSetScores?.[i]?.one?.toString() ?? '',
      two: initialSetScores?.[i]?.two?.toString() ?? '',
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPendingConfirm = status === 'pending_confirmation';
  const isDisputed = status === 'disputed';

  function setSetValue(i: number, side: 'one' | 'two', value: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: value } : s)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('match_id', matchId);
      if (scoringMode === 'sets') {
        // Solo los sets con ambos games cargados.
        const filled = sets
          .filter((s) => s.one.trim() !== '' && s.two.trim() !== '')
          .map((s) => ({ one: Number(s.one), two: Number(s.two) }));
        if (filled.length === 0) {
          setError('Carga al menos un set');
          return;
        }
        fd.set('set_scores', JSON.stringify(filled));
      } else {
        fd.set('score_one', scoreOne);
        fd.set('score_two', scoreTwo);
      }
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

  const referenceHint =
    scoringMode === 'sets'
      ? `Mejor de ${numSets ?? 3} · sets a ${gamesPerSet ?? 6} games`
      : scoringMode === 'games'
        ? `Set a ${pointsPerMatch ?? 9} games`
        : pointsPerMatch
          ? `Partido a ${pointsPerMatch} puntos`
          : null;

  return (
    <div className="space-y-3">
      {referenceHint ? (
        <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
          {referenceHint}
        </div>
      ) : null}
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

      {scoringMode === 'sets' ? (
        <div className="space-y-2">
          {/* Cabecera con nombres */}
          <div className="text-muted-foreground grid grid-cols-[1fr_auto] items-center gap-3 text-[11px] uppercase tracking-widest">
            <span className="truncate">{labelOne}</span>
            <span className="text-right">{labelTwo}</span>
          </div>
          {sets.map((s, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <span className="text-muted-foreground w-10 text-[10px] uppercase tracking-widest">
                Set {i + 1}
              </span>
              <span className="text-foreground/80 truncate text-xs">{labelOne}</span>
              <Input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                className="w-14 text-center font-display"
                value={s.one}
                onChange={(e) => setSetValue(i, 'one', e.target.value)}
                aria-label={`Games de ${labelOne} en set ${i + 1}`}
              />
              <Input
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                className="w-14 text-center font-display"
                value={s.two}
                onChange={(e) => setSetValue(i, 'two', e.target.value)}
                aria-label={`Games de ${labelTwo} en set ${i + 1}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}

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
