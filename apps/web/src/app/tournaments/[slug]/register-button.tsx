'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { registerToTournament } from '@/lib/tournament-actions';

interface Props {
  tournamentId: string;
  teamId?: string;
  asPlayer?: boolean;
  label?: string;
}

export function RegisterButton({ tournamentId, teamId, asPlayer, label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set('tournament_id', tournamentId);
    if (teamId) formData.set('team_id', teamId);
    if (asPlayer) formData.set('as_player', '1');

    startTransition(async () => {
      const res = await registerToTournament(formData);
      if (!res.ok) {
        alert(res.error ?? 'Error al inscribir');
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button onClick={handleClick} variant="crown" disabled={isPending}>
      {isPending ? 'Inscribiendo…' : label ?? 'Inscribir equipo'}
    </Button>
  );
}
