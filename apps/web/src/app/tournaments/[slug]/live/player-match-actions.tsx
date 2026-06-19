'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, Flag, Gavel, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { confirmMatchScore, forceCompleteMatch, reportMatchScore } from '@/lib/tournament-actions';

type ScoringMode = 'points' | 'games' | 'sets';
type SetScore = { one: number; two: number };

/**
 * Controles de marcador de un partido, en la misma página en vivo:
 * - organizador (isOrganizer) → edita y cierra cualquier partido directo;
 * - jugador participante → reporta / confirma / disputa su propio partido.
 */
export function PlayerMatchActions({
  matchId,
  status,
  mySide,
  reportedBySide,
  scoreOne,
  scoreTwo,
  setScores,
  isOrganizer = false,
  scoringMode = 'points',
  numSets,
  gamesPerSet,
}: {
  matchId: string;
  status: string;
  mySide?: 'one' | 'two';
  reportedBySide: 'one' | 'two' | null;
  scoreOne: number | null;
  scoreTwo: number | null;
  setScores?: SetScore[] | null;
  isOrganizer?: boolean;
  scoringMode?: ScoringMode;
  numSets?: number | null;
  gamesPerSet?: number | null;
}) {
  const router = useRouter();
  const isSets = scoringMode === 'sets';
  const maxSets = isSets ? (numSets ?? 3) : 0;
  const [s1, setS1] = useState(scoreOne?.toString() ?? '');
  const [s2, setS2] = useState(scoreTwo?.toString() ?? '');
  const [sets, setSets] = useState<{ one: string; two: string }[]>(() =>
    Array.from({ length: maxSets }, (_, i) => ({
      one: setScores?.[i]?.one?.toString() ?? '',
      two: setScores?.[i]?.two?.toString() ?? '',
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // El organizador puede re-editar incluso partidos cerrados (corregir).
  if (status === 'completed' && !isOrganizer) return null;

  const reportedSummary = setScores?.length
    ? setScores.map((s) => `${s.one}-${s.two}`).join(' ')
    : `${scoreOne}–${scoreTwo}`;

  function buildScore(fd: FormData): boolean {
    if (isSets) {
      const filled = sets
        .filter((s) => s.one.trim() !== '' && s.two.trim() !== '')
        .map((s) => ({ one: Number(s.one), two: Number(s.two) }));
      if (filled.length === 0) {
        setError('Carga al menos un set');
        return false;
      }
      fd.set('set_scores', JSON.stringify(filled));
    } else {
      fd.set('score_one', s1);
      fd.set('score_two', s2);
    }
    return true;
  }

  function report() {
    setError(null);
    const fd = new FormData();
    fd.set('match_id', matchId);
    if (!buildScore(fd)) return;
    startTransition(async () => {
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

  function forceClose() {
    setError(null);
    startTransition(async () => {
      const r = await forceCompleteMatch(matchId);
      if (!r.ok) return setError(r.error ?? 'Error');
      router.refresh();
    });
  }

  function setSetValue(i: number, side: 'one' | 'two', value: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: value } : s)));
  }

  // Inputs del marcador: por set (modo sets) o dos cajas (points/games).
  const scoreInputs = isSets ? (
    <div className="space-y-1.5">
      {sets.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-muted-foreground w-9 text-[9px] uppercase tracking-widest">
            Set {i + 1}
          </span>
          <Input
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            className="h-9 w-12 text-center font-display"
            value={s.one}
            onChange={(e) => setSetValue(i, 'one', e.target.value)}
            aria-label={`Games pareja 1 set ${i + 1}`}
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            className="h-9 w-12 text-center font-display"
            value={s.two}
            onChange={(e) => setSetValue(i, 'two', e.target.value)}
            aria-label={`Games pareja 2 set ${i + 1}`}
          />
        </div>
      ))}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        className="h-9 w-14 text-center font-display"
        value={s1}
        onChange={(e) => setS1(e.target.value)}
        aria-label="Marcador pareja 1"
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
        aria-label="Marcador pareja 2"
      />
    </div>
  );

  // Organizador: editor directo (carga marcador y cierra) en la misma vista.
  if (isOrganizer) {
    const pending = status === 'pending_confirmation' || status === 'disputed';
    return (
      <div className="border-border/40 mt-2 space-y-2 border-t pt-2">
        <div className="text-muted-foreground flex items-center gap-1 text-[9px] uppercase tracking-widest">
          <Gavel className="size-2.5" />
          Organizador
        </div>
        {scoreInputs}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="crown" onClick={report} disabled={isPending}>
            <Check className="size-3" />
            {isPending ? '…' : status === 'completed' ? 'Actualizar' : 'Guardar y cerrar'}
          </Button>
          {pending && (
            <Button size="sm" variant="outline" onClick={forceClose} disabled={isPending}>
              Aceptar lo reportado
            </Button>
          )}
        </div>
        {error && <p className="text-destructive text-[11px]">{error}</p>}
      </div>
    );
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
        Reportaste {reportedSummary}. Esperando que la otra pareja confirme.
      </p>
    );
  }

  // Pendiente y la otra pareja reportó → confirmo o disputo.
  if (status === 'pending_confirmation' && reportedBySide && reportedBySide !== mySide) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-muted-foreground text-[11px] normal-case">
          La otra pareja reportó <strong className="text-foreground">{reportedSummary}</strong>.
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
      {scoreInputs}
      <Button size="sm" variant="crown" onClick={report} disabled={isPending}>
        <Flag className="size-3" />
        {isPending ? '…' : 'Reportar'}
      </Button>
      {error && <p className="text-destructive text-[11px]">{error}</p>}
    </div>
  );
}
