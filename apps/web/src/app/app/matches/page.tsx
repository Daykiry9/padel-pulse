import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, MapPin, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarGroup } from '@/components/ui/avatar';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Countdown } from '@/components/ui/countdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { formatDate, formatTime } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { joinOpenMatch, leaveOpenMatch, cancelOpenMatch } from '@/lib/open-match-actions';

type OpenMatch = {
  id: string;
  slug: string;
  host_id: string;
  city: string;
  venue: string | null;
  scheduled_at: string;
  duration_minutes: number;
  category: string | null;
  max_players: number;
  current_players: number;
  message: string | null;
  status: string;
  host: { display_name: string; skill_category: string | null } | null;
};

type Participant = {
  open_match_id: string;
  profile_id: string;
  profiles: { display_name: string | null } | null;
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const user = await getSession();
  if (!user) redirect('/login?next=/app/matches');

  const supabase = await getSupabaseServerClient();

  // Profile para ciudad default
  const { data: profileData } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .maybeSingle();
  const myCity = (profileData as { city: string | null } | null)?.city ?? null;
  const cityFilter = cityParam === 'all' ? null : (cityParam ?? myCity);

  // open_matches y open_match_participants no en database.types generado
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;

  const { data: matchesData } = await sb
    .from('open_matches')
    .select(
      'id, slug, host_id, city, venue, scheduled_at, duration_minutes, category, max_players, current_players, message, status',
    )
    .eq('status', 'open')
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });
  const allMatchesRaw = (matchesData ?? []) as Omit<OpenMatch, 'host'>[];

  // C1: ya no se puede joinear profiles vía embed (profiles cerrado).
  // Hidratamos host con un lookup separado a profiles_public.
  const hostIds = Array.from(new Set(allMatchesRaw.map((m) => m.host_id)));
  const hostMap = new Map<string, { display_name: string; skill_category: string | null }>();
  if (hostIds.length > 0) {
    const { data: hosts } = await sb
      .from('profiles_public')
      .select('id, display_name, skill_category')
      .in('id', hostIds);
    for (const h of (hosts ?? []) as { id: string; display_name: string; skill_category: string | null }[]) {
      hostMap.set(h.id, { display_name: h.display_name, skill_category: h.skill_category });
    }
  }
  const allMatches: OpenMatch[] = allMatchesRaw.map((m) => ({
    ...m,
    host: hostMap.get(m.host_id) ?? null,
  }));

  // City filter client-side
  const matches = cityFilter
    ? allMatches.filter((m) => m.city.toLowerCase() === cityFilter.toLowerCase())
    : allMatches;

  type ParticipationRow = { open_match_id: string };
  const { data: myParticipations } = await sb
    .from('open_match_participants')
    .select('open_match_id')
    .eq('profile_id', user.id);
  const myMatchIds = new Set(
    ((myParticipations ?? []) as ParticipationRow[]).map((p) => p.open_match_id),
  );

  // Participantes para los visibles
  const participantsByMatch = new Map<string, Participant[]>();
  if (matches.length > 0) {
    const ids = matches.map((m) => m.id);
    type RawParticipant = { open_match_id: string; profile_id: string };
    const { data: ppl } = await sb
      .from('open_match_participants')
      .select('open_match_id, profile_id')
      .in('open_match_id', ids);
    const rawParticipants = (ppl ?? []) as RawParticipant[];

    // C1: hidratar display_name desde profiles_public
    const partIds = Array.from(new Set(rawParticipants.map((p) => p.profile_id)));
    const partNameMap = new Map<string, string | null>();
    if (partIds.length > 0) {
      const { data: partProfiles } = await sb
        .from('profiles_public')
        .select('id, display_name')
        .in('id', partIds);
      for (const pp of (partProfiles ?? []) as { id: string; display_name: string }[]) {
        partNameMap.set(pp.id, pp.display_name);
      }
    }

    for (const p of rawParticipants) {
      if (!participantsByMatch.has(p.open_match_id)) participantsByMatch.set(p.open_match_id, []);
      participantsByMatch.get(p.open_match_id)!.push({
        open_match_id: p.open_match_id,
        profile_id: p.profile_id,
        profiles: { display_name: partNameMap.get(p.profile_id) ?? null },
      });
    }
  }

  const cities = Array.from(new Set(allMatches.map((m) => m.city))).sort();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="crown">Partidos abiertos</Badge>
          <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            PARTIDOS
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            ¿Te falta un compañero o un cuarto? Abre tu partido o únete al de alguien más en tu
            ciudad.
          </p>
        </div>
        <Button variant="crown" asChild>
          <Link href="/app/matches/new">
            <Plus className="size-4" />
            Abrir partido
          </Link>
        </Button>
      </header>

      {/* City filter */}
      {cities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Ciudad:
          </span>
          <CityChip href="/app/matches?city=all" active={cityParam === 'all'} label="Todas" />
          {cities.map((c) => (
            <CityChip
              key={c}
              href={`/app/matches?city=${encodeURIComponent(c)}`}
              active={cityFilter === c && cityParam !== 'all'}
              label={c}
            />
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay partidos abiertos en tu zona"
          description="Cuando alguien abra un partido en tu ciudad, lo verás acá. ¿O quieres ser el primero en armarlo?"
          bullets={[
            'El host abre el partido con fecha y sede',
            'Otros jugadores ven los abiertos y se unen',
            'Cuando se completa la cancha (4 jugadores), todos reciben confirmación',
          ]}
          primaryAction={
            <Button variant="crown" asChild>
              <Link href="/app/matches/new">
                <Plus className="size-4" />
                Abrir el primero
              </Link>
            </Button>
          }
        />
      ) : (
        <Section title={`Disponibles · ${matches.length}`}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => {
              const isHost = m.host_id === user.id;
              const isParticipant = myMatchIds.has(m.id);
              const participants = participantsByMatch.get(m.id) ?? [];

              return (
                <Card key={m.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={m.current_players >= m.max_players ? 'muted' : 'success'}>
                        {m.current_players}/{m.max_players} jugadores
                      </Badge>
                      {m.category && (
                        <CategoryBadge kind="category" category={m.category} size="sm" />
                      )}
                    </div>
                    <Countdown target={m.scheduled_at} format="words" size="sm" />
                  </div>

                  <div className="text-muted-foreground space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <Calendar className="size-3" />
                      {formatDate(m.scheduled_at, { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' · '}
                      {formatTime(m.scheduled_at)}
                      {' · '}
                      {m.duration_minutes}min
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" />
                      {m.city}
                      {m.venue && ` · ${m.venue}`}
                    </div>
                  </div>

                  {m.message && (
                    <p className="text-foreground/80 border-border/40 line-clamp-2 border-l-2 pl-3 text-xs italic normal-case">
                      &ldquo;{m.message}&rdquo;
                    </p>
                  )}

                  <div className="border-border/40 flex items-center justify-between gap-2 border-t pt-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarGroup
                        avatars={participants.map((p) => ({
                          seed: p.profile_id,
                          name: p.profiles?.display_name ?? undefined,
                        }))}
                        max={3}
                        size="xs"
                      />
                      <span className="text-muted-foreground truncate text-xs">
                        {m.host?.display_name ?? 'Host'}
                      </span>
                    </div>

                    {isHost ? (
                      <ActionForm action={cancelOpenMatch}>
                        <input type="hidden" name="match_id" value={m.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                          Cancelar
                        </SubmitButton>
                      </ActionForm>
                    ) : isParticipant ? (
                      <ActionForm action={leaveOpenMatch}>
                        <input type="hidden" name="match_id" value={m.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                          Salirme
                        </SubmitButton>
                      </ActionForm>
                    ) : m.current_players >= m.max_players ? (
                      <Badge variant="muted">Lleno</Badge>
                    ) : (
                      <ActionForm action={joinOpenMatch}>
                        <input type="hidden" name="match_id" value={m.id} />
                        <SubmitButton variant="crown" size="sm" pendingLabel="…">
                          Unirme
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function CityChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`focus-card border-border inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition-colors ${
        active
          ? 'border-gold-400/40 bg-gold-400/15 text-gold-300'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
