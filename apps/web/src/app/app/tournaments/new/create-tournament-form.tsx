'use client';

import { useState } from 'react';

import { KING_CATEGORIES, QUEENS_CATEGORIES } from '@padelking/domain';
import type { CategoryKind, TournamentFormat } from '@padelking/domain';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { createTournament } from '@/lib/tournament-actions';

const CATEGORY_LABELS: Record<string, string> = {
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

// MVP: solo americano_fijo tiene bracket auto-generado funcionando.
// Los demás formatos quedan en el enum DB para futuros torneos pero
// se ocultan del UI hasta tener su generador implementado.
const FORMAT_LABELS: Partial<Record<TournamentFormat, string>> = {
  americano_fijo: 'Americano Pareja Fija (Tier 1)',
};

const FORMAT_COMING_SOON: Partial<Record<TournamentFormat, string>> = {
  americano_random: 'Americano Pareja Random (próximamente)',
  liguilla_casual: 'Liguilla Casual (próximamente)',
  liga: 'Liga (próximamente)',
  express: 'Express bracket (próximamente)',
  eliminacion: 'Eliminación directa (próximamente)',
};

const KIND_LABELS: Record<CategoryKind, string> = {
  estandar: 'Estándar masculino',
  suma: 'Suma masculina',
  mixto_estandar: 'Mixto estándar',
  mixto_suma: 'Mixto Suma',
  queens_estandar: 'Queens estándar',
  queens_suma: 'Queens Suma',
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

  const isAmericano = format === 'americano_fijo' || format === 'americano_random';
  const isSuma = categoryKind === 'suma' || categoryKind === 'mixto_suma' || categoryKind === 'queens_suma';
  const isQueens = categoryKind === 'queens_estandar' || categoryKind === 'queens_suma';
  const isEstandar = categoryKind === 'estandar' || categoryKind === 'queens_estandar';

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

      {isAmericano && (
        <FormField label="Modalidad del americano">
          <Select name="pairing_mode" defaultValue={format === 'americano_random' ? 'random' : 'fixed'}>
            <option value="fixed">Pareja fija</option>
            <option value="random">Pareja random</option>
            <option value="mixed">Mixto (slots fijos + random)</option>
          </Select>
        </FormField>
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

      {isEstandar && (
        <FormField label="Categoría estándar">
          <Select name="category" defaultValue={isQueens ? 'queens_c' : 'tercera'}>
            {(isQueens ? QUEENS_CATEGORIES : KING_CATEGORIES).map((c) => (
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
