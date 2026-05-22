'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportMatchScore } from '@/lib/tournament-actions';

export function MatchScoreForm({
  matchId,
  labelOne,
  labelTwo,
  initialScoreOne,
  initialScoreTwo,
}: {
  matchId: string;
  labelOne: string;
  labelTwo: string;
  initialScoreOne: number | null;
  initialScoreTwo: number | null;
}) {
  const [scoreOne, setScoreOne] = useState<string>(initialScoreOne?.toString() ?? '');
  const [scoreTwo, setScoreTwo] = useState<string>(initialScoreTwo?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

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
    });
  }

  return (
    <div className="space-y-3">
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
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={submit} disabled={isPending}>
          <Check className="size-3" />
          {isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        {savedAt && !isPending && (
          <span className="text-success text-xs">✓ Guardado</span>
        )}
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}
