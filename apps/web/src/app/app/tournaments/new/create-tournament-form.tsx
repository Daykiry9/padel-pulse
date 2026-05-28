'use client';

import { useState } from 'react';

import { FEMENINO_CATEGORIES, MASCULINO_CATEGORIES, MIXTO_CATEGORIES } from '@padelking/domain';
import type { CategoryKind, TournamentFormat } from '@padelking/domain';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { createTournament } from '@/lib/tournament-actions';

const CATEGORY_LABELS: Record<string, string> = {
  // Masculino (nuevo, 1-6)
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  // Mixto (nuevo, A-D)
  mixto_a: 'Mixto A',
  mixto_b: 'Mixto B',
  mixto_c: 'Mixto C',
  mixto_d: 'Mixto D',
  // Femenino (nuevo, A-D)
  femenino_a: 'Femenino A',
  femenino_b: 'Femenino B',
  femenino_c: 'Femenino C',
  femenino_d: 'Femenino D',
  // Legacy (data antigua, no se ofrece en UI)
  libre: 'Libre / Pro',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  queens_libre: 'Queens Libre',
  queens_a: 'Queens A',
  queens_b: 'Queens B',
  queens_c: 'Queens C',
  queens_d: 'Queens D',
  queens_e: 'Queens E',
};

// El formato YA define la modalidad: "Pareja Fija" = parejas fijas round-robin,
// "Pareja Random" = social, los jugadores rotan de compañero cada ronda.
// Los formatos sin generador implementado quedan deshabilitados ("próximamente").
const FORMAT_LABELS: Partial<Record<TournamentFormat, string>> = {
  americano_fijo: 'Americano Pareja Fija',
  americano_random: 'Americano Pareja Random',
};

const FORMAT_COMING_SOON: Partial<Record<TournamentFormat, string>> = {
  eliminacion: 'Eliminación directa (próximamente)',
  liga: 'Liga (próximamente)',
};

// Sets visibles en el UI. Suma queda en el enum por compatibilidad pero no se ofrece.
const KIND_LABELS: Partial<Record<CategoryKind, string>> = {
  estandar: 'Masculino',
  mixto_estandar: 'Mixto',
  queens_estandar: 'Femenino',
  casual: 'Casual (sin categoría)',
};

interface Props {
  clubs: { id: string; name: string; city: string }[];
  communities: { id: string; name: string }[];
  /** Si viene, el torneo lo organiza esta comunidad directamente (sin club). */
  community?: { id: string; name: string } | null;
}

export function CreateTournamentForm({ clubs, communities, community }: Props) {
  const [format, setFormat] = useState<TournamentFormat>('americano_fijo');
  const [categoryKind, setCategoryKind] = useState<CategoryKind>('estandar');

  const isRandom = format === 'americano_random';
  const isMasculino = categoryKind === 'estandar';
  const isFemenino = categoryKind === 'queens_estandar';
  const isMixto = categoryKind === 'mixto_estandar';
  const hasCategory = isMasculino || isFemenino || isMixto;
  // Suma queda en el enum por compatibilidad de data pero no se ofrece en UI nueva.
  const isSuma = false as boolean;

  const venues = clubs.length > 0 ? clubs : communities.map((c) => ({ id: c.id, name: `Club de ${c.name}`, city: '' }));

  return (
    <ActionForm action={createTournament}>
      <FormField label="Nombre del torneo" hint="Ej: Copa Apertura Junio 2026">
        <Input name="name" required minLength={4} placeholder="Mi Torneo" />
      </FormField>

      <FormField label="Formato">
        <Select
          name="format"
          value={format}
          onChange={(e) => setFormat(e.target.value as TournamentFormat)}
        >
          {Object.entries(FORMAT_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
          {Object.entries(FORMAT_COMING_SOON).map(([v, label]) => (
            <option key={v} value={v} disabled>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {isRandom && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Puntos por partido" hint="A cuántos puntos juega cada cancha por ronda. Típico: 12.">
            <Input name="points_per_match" type="number" min={4} max={64} defaultValue={12} />
          </FormField>
          <FormField label="Número de rondas" hint="Vacío = automático según # de jugadores.">
            <Input name="total_rounds" type="number" min={1} max={30} placeholder="Automático" />
          </FormField>
        </div>
      )}

      <FormField label="Tipo de categoría">
        <Select
          name="category_kind"
          value={categoryKind}
          onChange={(e) => setCategoryKind(e.target.value as CategoryKind)}
        >
          {Object.entries(KIND_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      {hasCategory && (
        <FormField label="Categoría">
          <Select
            name="category"
            defaultValue={isMasculino ? '3' : isFemenino ? 'femenino_b' : 'mixto_b'}
          >
            {(isMasculino
              ? MASCULINO_CATEGORIES
              : isFemenino
                ? FEMENINO_CATEGORIES
                : MIXTO_CATEGORIES
            ).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {isSuma && (
        <>
          <FormField label="Suma mínima" hint="Suma de valores de las 2 categorías (ej: 7, 8, 9...)">
            <Input name="min_sum" type="number" required min={3} max={16} defaultValue={8} />
          </FormField>

          <FormField
            label="Tope individual (opcional)"
            hint="Si lo activas, nadie con categoría < a este valor puede inscribirse. Vacío = sin tope."
          >
            <Input
              name="max_player_category_value"
              type="number"
              min={1}
              max={8}
              placeholder="Sin tope"
            />
          </FormField>
        </>
      )}

      {community ? (
        <>
          <input type="hidden" name="community_id" value={community.id} />
          <FormField label="Organiza">
            <div className="border-border bg-muted/30 text-foreground flex h-10 items-center rounded-md border px-3 text-sm">
              {community.name}
            </div>
          </FormField>
        </>
      ) : (
        <FormField label="Sede (club)">
          <Select name="club_id" required>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Fecha y hora de inicio">
        <Input name="starts_at" type="datetime-local" required />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Máx equipos">
          <Input name="max_teams" type="number" required min={4} max={64} defaultValue={16} />
        </FormField>
        <FormField label="Precio por equipo (COP)" hint="0 = gratis">
          <Input name="price_per_team" type="number" required min={0} defaultValue={0} />
        </FormField>
      </div>

      <FormField label="Descripción (opcional)">
        <Textarea name="description" placeholder="Reglas especiales, premios, sponsors…" />
      </FormField>

      <SubmitButton variant="crown" size="lg" pendingLabel="Creando…">
        Crear torneo
      </SubmitButton>
    </ActionForm>
  );
}
