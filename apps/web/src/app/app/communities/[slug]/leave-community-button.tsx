'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { leaveCommunity } from '@/lib/community-actions';
import * as haptics from '@/lib/haptics';

interface Props {
  communityId: string;
  communityName: string;
  isOwner: boolean;
}

export function LeaveCommunityButton({ communityId, communityName, isOwner }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLeave() {
    setError(null);
    const fd = new FormData();
    fd.set('community_id', communityId);
    startTransition(async () => {
      const result = await leaveCommunity(fd);
      if (!result.ok) {
        void haptics.error();
        setError(result.error ?? 'No se pudo abandonar la comunidad');
        toast.error(result.error ?? 'No se pudo abandonar la comunidad');
        return;
      }
      void haptics.success();
      toast.success('Abandonaste la comunidad');
      router.push(result.redirectTo ?? '/app/communities');
      router.refresh();
    });
  }

  return (
    <div className="border-border/40 bg-card/40 mt-6 rounded-lg border p-5">
      <h3 className="font-display text-sm uppercase tracking-widest">Abandonar comunidad</h3>
      <p className="text-muted-foreground mt-1 text-xs">
        Vas a dejar de ver el ranking, torneos y equipos de{' '}
        <strong className="text-foreground">{communityName}</strong>. Podés volver a pedir ingreso
        después.
        {isOwner && (
          <>
            {' '}
            Como owner, solo podés abandonar si hay otro owner que mantenga la comunidad.
          </>
        )}
      </p>

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-destructive mt-3 text-xs"
        >
          {error}
        </p>
      )}

      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-3"
          onClick={() => setConfirming(true)}
        >
          <LogOut className="size-3" />
          Abandonar comunidad
        </Button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={handleLeave}
            disabled={isPending}
          >
            <LogOut className="size-3" />
            {isPending ? 'Abandonando…' : 'Sí, abandonar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
