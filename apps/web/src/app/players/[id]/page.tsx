import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Crown, Instagram, MapPin } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { PublicHeader } from '@/components/public-header';
import { ShareLinkButton } from '@/components/share-link-button';
import { SiteFooter } from '@/components/site-footer';
import { CATEGORY_LABELS_SHORT } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCommunityPlayerRanking } from '@/lib/community-ranking';

const HAND_LABELS: Record<string, string> = {
  right: 'Derecha',
  left: 'Zurda',
};

const POSITION_LABELS: Record<string, string> = {
  drive: 'Drive',
  reves: 'Revés',
  ambos: 'Ambos',
};

// Solo exponemos datos públicos. NO mostramos: phone, birthdate exacta,
// email, marketing_opt_in. Mostramos: nombre, ciudad, categoría, ELO,
// instagram, mano, posición, año empezó.
type PublicProfile = {
  id: string;
  display_name: string;
  city: string | null;
  skill_category: string | null;
  gender: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
  playing_since_year: number | null;
  elo_rating: number;
};

type CommunityRankingItem = {
  communityId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  position: number;
  elo: number;
  totalPlayers: number;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = (await getSupabaseServerClient()) as any;
  const { data } = await sb.from('profiles_public').select('display_name, elo_rating').eq('id', id).maybeSingle();
  const p = data as { display_name: string; elo_rating: number | null } | null;
  if (!p) return {};
  const description = `Carta de jugador · ${p.elo_rating ?? 1000} ELO en PadelKing`;
  return { title: p.display_name, description, openGraph: { title: p.display_name, description } };
}

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // profiles_public vista nueva — cast hasta regenerar types tras migración.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;

  const { data: profileData } = await sb
    .from('profiles_public')
    .select(
      'id, display_name, city, skill_category, gender, instagram_handle, dominant_hand, favorite_position, playing_since_year, elo_rating',
    )
    .eq('id', id)
    .maybeSingle();
  const player = profileData as unknown as PublicProfile | null;
  if (!player) notFound();

  // Comunidades públicas en las que participa el jugador.
  const { data: memberRows } = await sb
    .from('community_members')
    .select('community_id, communities!inner(id, name, slug, logo_url, is_public)')
    .eq('profile_id', id)
    .eq('communities.is_public', true);

  type MemberRow = {
    community_id: string;
    communities: {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      is_public: boolean;
    };
  };
  const memberCommunities = ((memberRows ?? []) as MemberRow[]).map((r) => r.communities);

  // Para cada comunidad pública, sacar el ranking interno y la entry del jugador.
  const communityRankings: CommunityRankingItem[] = (
    await Promise.all(
      memberCommunities.map(async (c) => {
        const ranking = await getCommunityPlayerRanking(c.id);
        const idx = ranking.findIndex((e) => e.playerId === id);
        if (idx === -1) return null;
        const entry = ranking[idx]!;
        return {
          communityId: c.id,
          name: c.name,
          slug: c.slug,
          logoUrl: c.logo_url,
          position: idx + 1,
          elo: entry.elo,
          totalPlayers: ranking.length,
        };
      }),
    )
  ).filter((x): x is CommunityRankingItem => x !== null)
    .sort((a, b) => a.position - b.position);

  // Totales de torneos jugados para reliability (cuenta tournament_ids únicos
  // de las registrations del jugador). Reemplaza tournaments_played de la
  // vista consolidada (que removimos).
  const isQueens = player.gender === 'female' && player.skill_category?.startsWith('queens_');
  const yearsPlaying = player.playing_since_year
    ? new Date().getFullYear() - player.playing_since_year
    : null;

  // Players in common: comparten torneos
  type RegRow = {
    tournament_id: string;
    player_one_id: string | null;
    player_two_id: string | null;
    player_id: string | null;
  };
  const { data: myRegsData } = await supabase
    .from('tournament_registrations')
    .select('tournament_id, player_one_id, player_two_id, player_id')
    .or(`player_one_id.eq.${id},player_two_id.eq.${id},player_id.eq.${id}`);
  const myRegs = (myRegsData ?? []) as unknown as RegRow[];
  const myTournamentIds = Array.from(new Set(myRegs.map((r) => r.tournament_id)));

  let playersInCommon: { id: string; name: string; sharedCount: number }[] = [];
  if (myTournamentIds.length > 0) {
    const { data: otherRegsData } = await supabase
      .from('tournament_registrations')
      .select('tournament_id, player_one_id, player_two_id, player_id')
      .in('tournament_id', myTournamentIds);
    const otherRegs = (otherRegsData ?? []) as unknown as RegRow[];

    const counts = new Map<string, Set<string>>();
    for (const r of otherRegs) {
      const ids = [r.player_one_id, r.player_two_id, r.player_id].filter(Boolean) as string[];
      for (const otherId of ids) {
        if (otherId !== id) {
          if (!counts.has(otherId)) counts.set(otherId, new Set());
          counts.get(otherId)!.add(r.tournament_id);
        }
      }
    }
    const topIds = [...counts.entries()]
      .map(([profileId, ts]) => ({ profileId, count: ts.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (topIds.length > 0) {
      const { data: names } = await sb
        .from('profiles_public')
        .select('id, display_name')
        .in(
          'id',
          topIds.map((t) => t.profileId),
        );
      const nameMap = new Map(
        ((names ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
      );
      playersInCommon = topIds.map((t) => ({
        id: t.profileId,
        name: nameMap.get(t.profileId) ?? '?',
        sharedCount: t.count,
      }));
    }
  }

  // Reliability del ELO según torneos jugados (derivado de registrations).
  const tournamentsPlayed = myTournamentIds.length;
  const reliability =
    tournamentsPlayed === 0
      ? { level: 'none', label: 'Sin data', pct: 5 }
      : tournamentsPlayed < 3
        ? { level: 'low', label: 'Baja', pct: 25 }
        : tournamentsPlayed < 10
          ? { level: 'medium', label: 'Media', pct: 60 }
          : { level: 'high', label: 'Alta', pct: 95 };

  // Nivel sub-decimal estimado desde ELO (sólo display)
  // 800 → 1.0, 1000 → 2.0, 1200 → 3.0, 1400 → 4.0, etc.
  const elo = player.elo_rating ?? 1000;
  const estimatedLevel = Math.max(1.0, Math.min(7.0, 1.0 + (elo - 800) / 200));
  const levelLabel = elo < 1000 ? 'Rookie' : elo < 1400 ? 'Intermedio' : 'Avanzado';
  const accentText = isQueens ? 'text-queens' : 'text-crown';
  const categoryShort = player.skill_category
    ? (CATEGORY_LABELS_SHORT[player.skill_category] ?? player.skill_category).toUpperCase()
    : null;
  const initials = player.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const stats = [
    { label: 'Torneos', value: String(tournamentsPlayed) },
    { label: 'Nivel', value: estimatedLevel.toFixed(1) },
    {
      label: 'Posición',
      value: player.favorite_position ? (POSITION_LABELS[player.favorite_position] ?? '—') : '—',
    },
    {
      label: yearsPlaying !== null ? 'Años' : 'Mano',
      value:
        yearsPlaying !== null
          ? String(yearsPlaying)
          : player.dominant_hand
            ? (HAND_LABELS[player.dominant_hand] ?? '—')
            : '—',
    },
  ];

  return (
    <div className={`bg-background min-h-screen ${isQueens ? 'theme-queens' : ''}`}>
      <PublicHeader brand={isQueens ? 'queens' : 'kings'} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Carta de jugador (estilo Kings League): antes eran tarjetas sueltas
            de ELO / torneos / "perfil de juego" (esta ultima casi siempre
            vacia). Una carta reune lo mismo en algo que dan ganas de compartir. */}
        <div className="mx-auto max-w-sm">
          <div
            className={`relative isolate overflow-hidden rounded-[28px] border p-6 ${
              isQueens ? 'border-queens/50 bg-queens/[0.06]' : 'border-crown/50 bg-crown/[0.06]'
            } shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]`}
          >
            <div className="court-grid absolute inset-0 -z-10 opacity-40" aria-hidden />
            <div
              aria-hidden
              className={`absolute -right-16 -top-16 -z-10 size-56 rounded-full blur-3xl ${
                isQueens ? 'bg-queens/25' : 'bg-crown/25'
              }`}
            />

            <div className="flex items-start justify-between">
              <div>
                <div className={`font-display text-6xl leading-none tabular-nums tracking-tight ${accentText}`}>
                  {elo}
                </div>
                <div className="text-muted-foreground mt-1 text-[10px] uppercase tracking-widest">ELO</div>
                {categoryShort && (
                  <div className={`font-display mt-3 text-2xl leading-none tracking-tight ${accentText}`}>
                    {categoryShort}
                  </div>
                )}
              </div>
              <Crown className={`size-7 ${accentText}`} strokeWidth={1.5} aria-hidden />
            </div>

            <div
              className={`font-display mx-auto mt-2 flex size-36 items-center justify-center rounded-full border-2 text-5xl tracking-tight ${
                isQueens ? 'border-queens/60 bg-queens/10' : 'border-crown/60 bg-crown/10'
              }`}
              aria-hidden
            >
              {initials}
            </div>

            <h1 className="font-display mt-5 text-balance text-center text-3xl leading-none tracking-tight">
              {player.display_name.toUpperCase()}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest">
              {player.city && (
                <>
                  <MapPin className="size-3" />
                  {player.city} ·{' '}
                </>
              )}
              {levelLabel}
            </p>

            <div className={`my-5 h-px ${isQueens ? 'bg-queens/30' : 'bg-crown/30'}`} />

            <dl className="grid grid-cols-4 text-center">
              {stats.map((st) => (
                <div key={st.label} className="flex flex-col-reverse">
                  <dt className="text-muted-foreground mt-0.5 text-[9px] uppercase tracking-widest">{st.label}</dt>
                  <dd className="font-display text-xl tabular-nums tracking-tight">{st.value}</dd>
                </div>
              ))}
            </dl>

            <div className="text-muted-foreground mt-5 flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest">
              <span>Confianza del ELO</span>
              <span className="flex flex-1 items-center gap-2">
                <span className="bg-muted/60 h-1 flex-1 overflow-hidden rounded-full">
                  <span
                    className={`block h-full rounded-full ${isQueens ? 'bg-queens' : 'bg-crown'}`}
                    style={{ width: `${reliability.pct}%` }}
                  />
                </span>
                {reliability.label}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <ShareLinkButton
              label="Compartir carta"
              text={`${player.display_name} en PadelKing: ${elo} ELO${categoryShort ? ` · ${categoryShort}` : ''}. ¿Te le mides?`}
            />
            {player.instagram_handle && (
              <Link
                href={`https://instagram.com/${player.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex min-h-11 items-center justify-center gap-1.5 text-xs uppercase tracking-widest"
              >
                <Instagram className="size-3.5" />@{player.instagram_handle}
              </Link>
            )}
          </div>
        </div>

        {/* Ranking en sus comunidades (solo si hay algo que mostrar) */}
        {communityRankings.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg tracking-tight">RANKING EN SUS COMUNIDADES</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Posición y ELO interno en cada comunidad pública.
          </p>
          {communityRankings.length === 0 ? (
            <div className="text-muted-foreground mt-4 rounded-lg border border-dashed border-border/40 px-4 py-6 text-center text-xs">
              Aún no participa en comunidades públicas
            </div>
          ) : (
            <ul className="divide-border/30 mt-4 divide-y">
              {communityRankings.map((c) => (
                <li key={c.communityId}>
                  <Link
                    href={`/app/communities/${c.slug}`}
                    className="focus-card hover:bg-muted/30 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                  >
                    <Avatar
                      seed={c.communityId}
                      name={c.name}
                      src={c.logoUrl ?? undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        #{c.position} de {c.totalPlayers}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-display text-lg tabular-nums ${isQueens ? 'text-queens' : 'text-crown'}`}>
                        {c.elo}
                      </div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        ELO
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}

        {/* Players in common: compartió torneo con */}
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg tracking-tight">JUGADORES EN COMÚN</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Los que más torneos ha compartido con este perfil.
          </p>
          {playersInCommon.length === 0 ? (
            <div className="text-muted-foreground mt-4 rounded-lg border border-dashed border-border/40 px-4 py-6 text-center text-xs">
              Aún sin torneos compartidos
            </div>
          ) : (
            <ul className="divide-border/30 mt-4 divide-y">
              {playersInCommon.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/players/${p.id}`}
                    className="focus-card hover:bg-muted/30 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                  >
                    <Avatar seed={p.id} name={p.name} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="text-muted-foreground text-xs uppercase tracking-widest tabular-nums">
                      {p.sharedCount} {p.sharedCount === 1 ? 'torneo' : 'torneos'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="text-muted-foreground mt-8 text-center text-xs">
          Perfil público de PadelKing.{' '}
          <Link href="/app" className="text-crown hover:underline">
            Ver mi ranking
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
