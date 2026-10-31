import Link from 'next/link';
import { ArrowRight, CalendarPlus, Check } from 'lucide-react';

import { CATEGORY_LABELS } from '@padelking/domain';
import type { Gender, TeamCategory } from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PriceTag } from '@/components/ui/price-tag';
import { RegisterButton } from '@/app/tournaments/[slug]/register-button';
import { formatShort } from '@/lib/format-date';
import { isNativeApp } from '@/lib/native';

export type RegistrationCardTournament = {
  id: string;
  slug: string;
  name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  category_kind: string;
  category: TeamCategory | null;
  min_sum: number | null;
  max_player_category_value: number | null;
  competition_unit: string;
  max_teams: number;
  price_per_team: number;
};

/**
 * Tarjeta de inscripcion del torneo (datos clave + medidor de cupos + CTA, y
 * "ESTAS DENTRO" una vez inscrito). Compartida entre el detalle publico
 * (/tournaments/[slug]) y el de comunidad (/app/communities/.../tournaments/...):
 * el usuario logueado en un torneo de comunidad caia en una version vieja con
 * la inscripcion al fondo, debajo del chat, sin cupos ni confirmacion.
 */
export async function TournamentRegistrationCard({
  tournament,
  registrations,
  user,
  userIsParticipant,
  myProfile,
  myTeams,
}: {
  tournament: RegistrationCardTournament;
  registrations: { status: string }[];
  user: { id: string } | null;
  userIsParticipant: boolean;
  myProfile: { skillCategory: TeamCategory | null; gender: Gender | null; eligibility: { ok: boolean; reason?: string } } | null;
  myTeams: { id: string; name: string; category: TeamCategory | null; eligibility: { ok: boolean; reason?: string } }[];
}) {
  const isIndividual = tournament.competition_unit === 'player';

  // Mismo criterio que el gate del server (registerToTournament): solo confirmed.
  const isFull =
    registrations.filter((r) => r.status === 'confirmed').length >= tournament.max_teams;

  // Urgencia: cupos que quedan y cuanto falta para arrancar. "10 / 12" no
  // le decia a nadie que quedaban dos cupos.
  const taken = Math.min(registrations.length, tournament.max_teams);
  const spotsLeft = tournament.max_teams - taken;
  const almostFull = spotsLeft > 0 && spotsLeft <= Math.max(2, Math.ceil(tournament.max_teams * 0.25));
  const msToStart = new Date(tournament.starts_at).getTime() - Date.now();
  // Calendario: en la app nativa un .ics del mismo origen no se descarga en el
  // WebView, asi que alla va el template de Google Calendar (abre afuera).
  const native = await isNativeApp();
  const calStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calStart = new Date(tournament.starts_at);
  const calEnd = tournament.ends_at ? new Date(tournament.ends_at) : new Date(calStart.getTime() + 3 * 3_600_000);
  const calDates = `${calStamp(calStart)}/${calStamp(calEnd)}`;
  const startsIn =
    tournament.status !== 'open' || msToStart <= 0
      ? null
      : msToStart < 3_600_000
        ? `${Math.ceil(msToStart / 60_000)} min`
        : msToStart < 86_400_000
          ? `${Math.floor(msToStart / 3_600_000)} h ${Math.floor((msToStart % 3_600_000) / 60_000)} min`
          : `${Math.floor(msToStart / 86_400_000)} d ${Math.floor((msToStart % 86_400_000) / 3_600_000)} h`;

  return (
    <Card className="overflow-hidden p-0">
      {/* Fecha, categoría y cupos vivían en tres tarjetas apiladas encima:
          en móvil eran ~300px de alto para tres datos de una línea cada
          uno, y empujaban la inscripción fuera de la primera pantalla.
          Fusionadas con el CTA, los datos que decides mirar antes de
          inscribirte quedan pegados al botón con el que te inscribes. */}
      <dl className="divide-border/40 border-border/40 grid grid-cols-3 divide-x border-b">
        <div className="px-3 py-3 md:px-4">
          <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Fecha
          </dt>
          {/* formatShort ("vie · 24 may · 19:00") en vez de formatDateTime:
              el largo se partia en tres lineas dentro de una columna de
              ~110px y estiraba la franja entera. */}
          <dd className="font-display mt-1 text-sm leading-snug tracking-tight">
            {formatShort(tournament.starts_at)}
          </dd>
        </div>
        <div className="px-3 py-3 md:px-4">
          <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Categoría
          </dt>
          <dd className="font-display mt-1 text-sm leading-snug tracking-tight">
            {tournament.category_kind === 'suma' ||
            tournament.category_kind === 'mixto_suma' ||
            tournament.category_kind === 'queens_suma'
              ? `Suma ≥ ${tournament.min_sum}${tournament.max_player_category_value ? ` (tope ${tournament.max_player_category_value})` : ''}`
              : tournament.category
                ? (CATEGORY_LABELS[tournament.category] ?? tournament.category)
                : 'Casual'}
          </dd>
        </div>
        <div className="px-3 py-3 md:px-4">
          <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Cupos
          </dt>
          <dd className="font-display mt-1 text-sm leading-snug tracking-tight tabular-nums">
            {registrations?.length ?? 0} / {tournament.max_teams}
            <span className="text-muted-foreground ml-1 text-[10px] uppercase tracking-widest">
              {isIndividual ? 'jug.' : 'eq.'}
            </span>
          </dd>
        </div>
      </dl>

      {tournament.status === 'open' && (
        <div className="border-border/40 space-y-2 border-b px-6 py-4">
          <div className="flex items-baseline justify-between gap-3 text-xs uppercase tracking-widest">
            <span className={almostFull ? 'text-live font-semibold' : isFull ? 'text-muted-foreground' : 'text-crown'}>
              {isFull
                ? 'Cupo completo'
                : spotsLeft === 1
                  ? '¡Queda 1 cupo!'
                  : almostFull
                    ? `¡Quedan ${spotsLeft} cupos!`
                    : `Quedan ${spotsLeft} cupos`}
            </span>
            {startsIn && <span className="text-muted-foreground tabular-nums">Arranca en {startsIn}</span>}
          </div>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: tournament.max_teams }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < taken ? (almostFull ? 'bg-live' : 'bg-crown') : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl tracking-tight">INSCRIPCIÓN</h2>
          <PriceTag value={tournament.price_per_team} size="lg" />
        </div>
        {!user ? (
        // El que llega por un link de torneo casi siempre es nuevo: el CTA
        // principal crea la cuenta y lo devuelve aca a inscribirse.
        <div className="space-y-3">
          <Button variant="crown" size="xl" className="w-full" disabled={isFull} asChild={!isFull}>
            {isFull ? (
              <span>Cupo completo</span>
            ) : (
              <Link href={`/signup?next=/tournaments/${tournament.slug}`}>
                Inscribirme
                <ArrowRight className="size-5" />
              </Link>
            )}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            ¿Ya tienes cuenta?{' '}
            <Link href={`/login?next=/tournaments/${tournament.slug}`} className="text-crown underline">
              Ingresa
            </Link>
          </p>
        </div>
      ) : userIsParticipant ? (
        // Momento de mas emocion del flujo: antes era una linea verde y
        // ya. Ahora confirma en grande y empuja a traer al grupo (el link
        // muestra el preview con cupos) y a agendarlo.
        <div className="border-success/30 bg-success/[0.05] animate-in fade-in zoom-in-95 space-y-4 rounded-xl border p-5 duration-500">
          <div className="flex items-start gap-3">
            <span className="bg-success/15 text-success flex size-10 shrink-0 items-center justify-center rounded-full">
              <Check className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-display text-3xl leading-none tracking-tight">ESTÁS DENTRO.</div>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {startsIn ? `Arranca en ${startsIn} · ` : ''}
                {formatShort(tournament.starts_at)}
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Me inscribí a ${tournament.name} (${formatShort(tournament.starts_at)}).${
                  spotsLeft > 0 ? ` Quedan ${spotsLeft} cupos, ¡métete!` : ''
                }\n\nhttps://padelking.co/tournaments/${tournament.slug}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-semibold uppercase tracking-wide text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
            >
              Avísale a tu grupo
            </a>
            <Button variant="outline" className="min-h-12" asChild>
              <a
                href={
                  native
                    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(tournament.name)}&dates=${calDates}&details=${encodeURIComponent(`https://padelking.co/tournaments/${tournament.slug}`)}`
                    : `/api/calendar/${tournament.slug}`
                }
                target={native ? '_blank' : undefined}
                rel={native ? 'noopener noreferrer' : undefined}
              >
                <CalendarPlus className="size-4" />
                Agregar al calendario
              </a>
            </Button>
          </div>
        </div>
      ) : isFull ? (
        <div className="border-border/40 bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border p-4 text-sm">
          Cupo completo: {tournament.max_teams} {isIndividual ? 'jugadores' : 'equipos'}.
        </div>
      ) : isIndividual ? (
        <div className="space-y-3">
          <p className="text-sm">
            Este torneo es individual. Tu categoría:{' '}
            <strong>{myProfile?.skillCategory ?? '—'}</strong>
          </p>
          {myProfile?.eligibility.ok ? (
            <RegisterButton
              tournamentId={tournament.id}
              mode="individual"
              label="Inscribirme como jugador"
            />
          ) : (
            <p className="text-destructive text-sm">{myProfile?.eligibility.reason}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">
            Puedes inscribirte con un equipo registrado, o con un compañero solo
            para este torneo (lo más común en pádel amateur).
          </p>

          {/* Opción A: equipos registrados elegibles */}
          {myTeams.filter((t) => t.eligibility.ok).length > 0 && (
            <div className="space-y-3 rounded-lg bg-muted/30 p-4">
              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Opción A · Equipo registrado
              </div>
              {myTeams.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-sm">{t.name}</div>
                    <div className="text-muted-foreground text-xs uppercase tracking-widest">
                      {t.category ? CATEGORY_LABELS[t.category] : 'Mixto'}
                    </div>
                    {!t.eligibility.ok && (
                      <div className="text-destructive mt-1 text-xs">
                        {t.eligibility.reason}
                      </div>
                    )}
                  </div>
                  {!t.eligibility.ok && <Badge variant="muted">No elegible</Badge>}
                </div>
              ))}
              <RegisterButton
                tournamentId={tournament.id}
                mode="team"
                teams={myTeams
                  .filter((t) => t.eligibility.ok)
                  .map((t) => ({ id: t.id, name: t.name }))}
              />
            </div>
          )}

          {/* Opción B: ad-hoc partner (siempre disponible para Tier 1) */}
          <div className="space-y-3 rounded-lg bg-muted/30 p-4">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              {myTeams.filter((t) => t.eligibility.ok).length > 0
                ? 'Opción B · Compañero solo para este torneo'
                : 'Inscríbete con un compañero'}
            </div>
            <p className="text-muted-foreground text-sm">
              Tu categoría:{' '}
              <strong className="text-foreground">{myProfile?.skillCategory ?? '—'}</strong>
              . La elegibilidad se valida cuando confirmes el compañero.
            </p>
            <RegisterButton tournamentId={tournament.id} mode="adhoc" />
          </div>
        </div>
        )}
      </div>
    </Card>
  );
}
