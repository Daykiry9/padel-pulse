'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { X } from 'lucide-react';

import { removeRegistration } from '@/lib/tournament-actions';

/** Botón "X" del organizador para quitar a un inscrito del torneo. */
export function RemoveRegistrationButton({
  registrationId,
  label,
}: {
  registrationId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm(`¿Eliminar a "${label}" del torneo?`)) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('registration_id', registrationId);
      const r = await removeRegistration(fd);
      if (!r.ok) {
        setError(r.error ?? 'Error');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-destructive text-[10px]">{error}</span>}
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive -my-2.5 -mr-1.5 inline-flex size-11 items-center justify-center rounded-md transition-[background-color,color] duration-[120ms] disabled:opacity-40"
        aria-label={`Eliminar inscripción de ${label}`}
        title="Eliminar inscripción"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
