'use client';

import { useMemo, useState } from 'react';

import {
  CATEGORY_LABELS,
  FEMENINO_CATEGORIES,
  MASCULINO_CATEGORIES,
  MIXTO_CATEGORIES,
} from '@padelking/domain';
import type { CategoryKind, TournamentFormat } from '@padelking/domain';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { createTournament } from '@/lib/tournament-actions';

// El formato YA define la modalidad: "Pareja Fija" = parejas fijas round-robin,
// "Pareja Random" = social, los jugadores rotan de compañero cada ronda.
// Liga / Liguilla / Express / Eliminación están todos soportados con generador.
const FORMAT_LABELS: Partial<Record<TournamentFormat, string>> = {
  americano_fijo: 'Americano Pareja Fija',
  americano_random: 'Americano Pareja Random',
  liga: 'Liga (round-robin)',
  liguilla_casual: 'Liguilla Casual (mini-liga, máx 8 parejas)',
  express: 'Express (americano corto, 6 rondas)',
  eliminacion: 'Eliminación directa',
};

const FORMAT_COMING_SOON: Partial<Record<TournamentFormat, string>> = {};

// Sets visibles en el UI. Suma queda en el enum por compatibilidad pero no se ofrece.
const KIND_LABELS: Partial<Record<CategoryKind, string>> = {
  estandar: 'Masculino',
  mixto_estandar: 'Mixto',
  queens_estandar: 'Femenino',
  casual: 'Casual (sin categoría)',
};

type Scope = 'community' | 'club_private' | 'club_open';

interface Club {
  id: string;
  name: string;
  city_id: string | null;
  city: string | null;
}

interface Props {
  organizerCommunities: { id: string; name: string }[];
  myClubs: Club[];
  cities: { id: string; name: string }[];
  defaultCommunityId: string | null;
  /** Si viene ?community=<id>, fijamos el scope a 'community' sin permitir cambiarlo. */
  forcedCommunityId: string | null;
}

export function CreateTournamentForm({
  organizerCommunities,
  myClubs,
  cities,
  defaultCommunityId,
  forcedCommunityId,
}: Props) {
  const [format, setFormat] = useState<TournamentFormat>('americano_fijo');
  const [categoryKind, setCategoryKind] = useState<CategoryKind>('estandar');

  const isClubOwner = myClubs.length > 0;
  const canOrganizeCommunity = organizerCommunities.length > 0;

  // Scope inicial: si vino forced → community; si es club_owner pero no tiene
  // comunidades, default a club_private; si tiene comunidades, default a community.
  const initialScope: Scope = forcedCommunityId
    ? 'community'
    : canOrganizeCommunity
      ? 'community'
      : isClubOwner
        ? 'club_private'
        : 'community';
  const [scope, setScope] = useState<Scope>(initialScope);

  const [communityId, setCommunityId] = useState<string>(
    forcedCommunityId ?? defaultCommunityId ?? organizerCommunities[0]?.id ?? '',
  );
  const [clubId, setClubId] = useState<string>(myClubs[0]?.id ?? '');
  const selectedClub = useMemo(
    () => myClubs.find((c) => c.id === clubId) ?? null,
    [myClubs, clubId],
  );
  const [cityId, setCityId] = useState<string>(
    selectedClub?.city_id ?? cities[0]?.id ?? '',
  );

  const isRandom = format === 'americano_random';
  const isExpress = format === 'express';
  const isPlayerBased = isRandom || isExpress;
  const isMasculino = categoryKind === 'estandar';
  const isFemenino = categoryKind === 'queens_estandar';
  const isMixto = categoryKind === 'mixto_estandar';
  const hasCategory = isMasculino || isFemenino || isMixto;
  // Suma queda en el enum por compatibilidad de data pero no se ofrece en UI nueva.
  const isSuma = false as boolean;

  // ¿Qué opciones de scope puede ver?
  // - Siempre: community (si tiene al menos 1 comunidad donde es owner/admin)
  // - Solo club_owner: club_private y club_open
  const scopeOptions: { value: Scope; title: string; desc: string; disabled?: boolean }[] = [];
  if (canOrganizeCommunity) {
    scopeOptions.push({
      value: 'community',
      title: 'Torneo de mi comunidad',
      desc: 'Organiza la comunidad. Solo miembros pueden inscribirse.',
    });
  }
  if (isClubOwner) {
    scopeOptions.push({
      value: 'club_private',
      title: 'Torneo del club privado',
      desc: 'Organiza el club. Solo socios del club pueden inscribirse.',
    });
    scopeOptions.push({
      value: 'club_open',
      title: 'Torneo del club abierto',
      desc: 'Organiza el club, visible a varias comunidades de la misma ciudad.',
    });
  }

  // Caso edge: el user no es ni club_owner ni miembro owner/admin de ninguna
  // comunidad. No puede crear torneos.
  if (scopeOptions.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-md border p-6 text-sm">
        Para crear un torneo necesitas ser dueño/admin de una comunidad o dueño de un club.
      </div>
    );
  }

  const scopeLocked = Boolean(forcedCommunityId);

  return (
    <ActionForm action={createTournament}>
      {/* === ALCANCE (SCOPE) ============================================ */}
      <fieldset className="space-y-3" disabled={scopeLocked}>
        <legend className="text-foreground text-sm font-medium">Alcance del torneo</legend>
        <div className="space-y-2">
          {scopeOptions.map((opt) => {
            const checked = scope === opt.value;
            return (
              <label
                key={opt.value}
                className={`border-border hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  checked ? 'border-foreground bg-muted/30' : ''
                } ${scopeLocked && !checked ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="scope"
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => setScope(e.target.value as Scope)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-foreground text-sm font-medium">{opt.title}</div>
                  <div className="text-muted-foreground text-xs">{opt.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
        {scopeLocked && (
          <p className="text-muted-foreground text-xs">
            Llegaste desde una comunidad específica, el alcance queda fijo.
          </p>
        )}
      </fieldset>
      {/* Un fieldset disabled excluye sus controles del submit; cuando el scope
          queda fijo, lo enviamos por un hidden fuera del fieldset. */}
      {scopeLocked && <input type="hidden" name="scope" value={scope} />}

      {/* === ORGANIZADOR según scope ==================================== */}
      {scope === 'community' && (
        <FormField label="Comunidad organizadora">
          {forcedCommunityId ? (
            <>
              <input type="hidden" name="community_id" value={forcedCommunityId} />
              <div className="border-border bg-muted/30 text-foreground flex h-10 items-center rounded-md border px-3 text-sm">
                {organizerCommunities.find((c) => c.id === forcedCommunityId)?.name ?? '—'}
              </div>
            </>
          ) : (
            <Select
              name="community_id"
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              required
            >
              {organizerCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}

      {(scope === 'club_private' || scope === 'club_open') && (
        <FormField label="Club organizador">
          <Select
            name="club_id"
            value={clubId}
            onChange={(e) => {
              setClubId(e.target.value);
              const newClub = myClubs.find((c) => c.id === e.target.value);
              if (newClub?.city_id) setCityId(newClub.city_id);
            }}
            required
          >
            {myClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` — ${c.city}` : ''}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {scope === 'club_open' && (
        <FormField
          label="Ciudad del torneo"
          hint="Define qué comunidades de la ciudad pueden ver e inscribirse."
        >
          <Select
            name="city_id"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecciona una ciudad
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {/* === DATOS DEL TORNEO =========================================== */}
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

      {isPlayerBased && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Puntos por partido" hint="A cuántos puntos juega cada cancha por ronda. Típico: 12.">
            <Input name="points_per_match" type="number" min={4} max={64} defaultValue={12} />
          </FormField>
          <FormField
            label="Número de rondas"
            hint={isExpress ? 'Express usa 6 rondas por defecto.' : 'Vacío = automático según # de jugadores.'}
          >
            <Input
              name="total_rounds"
              type="number"
              min={1}
              max={30}
              placeholder={isExpress ? '6' : 'Automático'}
              defaultValue={isExpress ? 6 : undefined}
            />
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
