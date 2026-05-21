'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { registerToTournament } from '@/lib/tournament-actions';

interface TeamOption {
  id: string;
  name: string;
}

interface Props {
  tournamentId: string;
  mode: 'team' | 'adhoc' | 'individual';
  teams?: TeamOption[];
  label?: string;
}

/**
 * Botón de inscripción a torneo. 3 modalidades:
 *   - individual: directo (Tier 2)
 *   - team: dropdown con tus equipos registrados
 *   - adhoc: input con nombre de compañero para pareja efímera
 */
export function RegisterButton({ tournamentId, mode, teams, label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  function submit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const res = await registerToTournament(formData);
      if (!res.ok) {
        setError(res.error ?? 'Error al inscribir');
        return;
      }
      router.refresh();
    });
  }

  if (mode === 'individual') {
    return (
      <div className="space-y-2">
        <Button
          variant="crown"
          disabled={isPending}
          onClick={() => {
            const fd = new FormData();
            fd.set('tournament_id', tournamentId);
            fd.set('modality', 'individual');
            submit(fd);
          }}
        >
          {isPending ? 'Inscribiendo…' : (label ?? 'Inscribirme')}
        </Button>
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="crown" onClick={() => setOpen(true)}>
        {label ?? (mode === 'team' ? 'Inscribir equipo' : 'Inscribirme con compañero')}
      </Button>
    );
  }

  return (
    <form
      className="max-w-sm space-y-3"
      action={(fd) => {
        fd.set('tournament_id', tournamentId);
        fd.set('modality', mode);
        submit(fd);
      }}
    >
      {mode === 'team' ? (
        <FormField label="Tu equipo">
          <Select name="team_id" required>
            {teams!.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>
      ) : (
        <FormField
          label="Compañero ad-hoc"
          hint="Nombre exacto con el que se registró en PadelKing. La pareja solo aplica a este torneo."
        >
          <Input name="partner_search" required placeholder="Ej: Andrés Mejía" />
        </FormField>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="crown" disabled={isPending} size="sm">
          {isPending ? 'Inscribiendo…' : 'Confirmar inscripción'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
