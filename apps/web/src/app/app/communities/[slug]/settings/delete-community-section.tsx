'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteCommunity } from '@/lib/community-actions';

type DeleteError = 'confirmation' | 'tournaments' | 'not_owner' | 'invalid' | 'server' | null;

interface Props {
  communityId: string;
  slug: string;
  communityName: string;
  showError?: DeleteError;
}

const ERROR_MESSAGES: Record<Exclude<DeleteError, null>, string> = {
  confirmation: 'No escribiste "ELIMINAR" exactamente. Intentá de nuevo.',
  tournaments:
    'No se puede eliminar: hay torneos en curso en esta comunidad. Finalizá o cancelá los torneos primero.',
  not_owner: 'Solo el owner puede eliminar la comunidad.',
  invalid: 'Datos inválidos.',
  server: 'No pudimos eliminar la comunidad. Intentá de nuevo más tarde.',
};

export function DeleteCommunitySection({ communityId, slug, communityName, showError }: Props) {
  const [open, setOpen] = useState(showError === 'confirmation');
  const [confirm, setConfirm] = useState('');
  const enabled = confirm === 'ELIMINAR';

  return (
    <div className="border-destructive/30 bg-destructive/[0.04] mt-8 rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-destructive size-4" />
        <h2 className="font-display text-lg tracking-tight">ZONA PELIGROSA</h2>
      </div>
      <p className="text-muted-foreground mt-2 text-sm">
        Eliminar <strong className="text-foreground">{communityName}</strong> borra la comunidad,
        sus miembros, equipos asociados y torneos finalizados. Es definitivo y no se puede
        deshacer. No podrás eliminarla si tiene torneos en curso.
      </p>

      {showError && showError !== 'confirmation' && (
        <p className="text-destructive mt-3 text-xs">{ERROR_MESSAGES[showError]}</p>
      )}

      {!open ? (
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-4"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-3" />
          Eliminar esta comunidad
        </Button>
      ) : (
        <form action={deleteCommunity} className="mt-4 space-y-3">
          <input type="hidden" name="community_id" value={communityId} />
          <input type="hidden" name="slug" value={slug} />
          <p className="text-foreground text-sm">
            Para confirmar, escribí{' '}
            <strong className="font-mono tracking-wider">ELIMINAR</strong> abajo.
          </p>
          <Input
            name="confirmation"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="ELIMINAR"
            autoComplete="off"
            autoCapitalize="characters"
            className="max-w-sm"
          />
          {showError === 'confirmation' && (
            <p className="text-destructive text-xs">{ERROR_MESSAGES.confirmation}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!enabled}
              className="bg-destructive text-destructive-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-3" />
              Sí, eliminar definitivamente
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setConfirm('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
