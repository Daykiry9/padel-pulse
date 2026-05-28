'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteMyAccount } from '@/lib/auth-actions';

/** Zona peligrosa: eliminar cuenta in-app (requisito App Store / Play Store). */
export function DeleteAccountSection({ showError }: { showError?: 'confirmation' | 'server' | null }) {
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
        Eliminar tu cuenta borra tus datos personales de PadelKing (nombre, email, teléfono, etc.)
        y revoca tu acceso. Es definitivo y no se puede deshacer.
      </p>

      {showError === 'server' && (
        <p className="text-destructive mt-3 text-xs">
          No pudimos eliminar tu cuenta. Reintentá o escribí a{' '}
          <a href="mailto:privacidad@padelking.co" className="underline">
            privacidad@padelking.co
          </a>
          .
        </p>
      )}

      {!open ? (
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-4"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-3" />
          Eliminar mi cuenta
        </Button>
      ) : (
        <form action={deleteMyAccount} className="mt-4 space-y-3">
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
            <p className="text-destructive text-xs">
              No escribiste &quot;ELIMINAR&quot; exactamente. Intentá de nuevo.
            </p>
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
