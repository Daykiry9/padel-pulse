import { ImageResponse } from 'next/og';

import { CATEGORY_LABELS, computeAmericanoStandings } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadShareFonts } from '@/lib/share-fonts';
import { KingMark } from '@/lib/share/king-mark';

export const runtime = 'nodejs';

/**
 * Podium share image (1080x1920). Renderiza top 3 del torneo:
 *   - americano_random: ranking de jugadores por puntos (computeAmericanoStandings)
 *   - resto: ranking por equipo según wins/diff/gamesFor (mismo orden que /live)
 *
 * Sin AI, sin tokens externos. Satori HTML→PNG en CPU local.
 */

type TournamentRow = {
  id: string;
  name: string;
  status: string;
  format: string;
  category_kind: string;
  category: string | null;
  min_sum: number | null;
  community_id: string | null;
};

type RegRow = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
  guest_player_id: string | null;
  guest_player_one_id: string | null;
  guest_player_two_id: string | null;
};

type MatchRow = {
  status: string;
  registration_one_id: string | null;
  registration_two_id: string | null;
  score_one: number | null;
  score_two: number | null;
  pair_one_player_one_id: string | null;
  pair_one_player_two_id: string | null;
  pair_two_player_one_id: string | null;
  pair_two_player_two_id: string | null;
  pair_one_guest_one_id: string | null;
  pair_one_guest_two_id: string | null;
  pair_two_guest_one_id: string | null;
  pair_two_guest_two_id: string | null;
};

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, name, status, format, category_kind, category, min_sum, community_id')
    .eq('slug', slug)
    .single();
  const t = tData as unknown as TournamentRow | null;
  if (!t) return new Response('Tournament not found', { status: 404 });

  const [regsRes, matchesRes] = await Promise.all([
    supabase
      .from('tournament_registrations')
      .select(
        'id, team_id, player_one_id, player_two_id, player_id, guest_player_id, guest_player_one_id, guest_player_two_id',
      )
      .eq('tournament_id', t.id)
      .eq('status', 'confirmed'),
    supabase
      .from('matches')
      .select(
        'status, registration_one_id, registration_two_id, score_one, score_two, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id, pair_one_guest_one_id, pair_one_guest_two_id, pair_two_guest_one_id, pair_two_guest_two_id',
      )
      .eq('tournament_id', t.id),
  ]);
  const registrations = (regsRes.data ?? []) as unknown as RegRow[];
  const matches = (matchesRes.data ?? []) as unknown as MatchRow[];

  // Resolvemos nombres (teams + profiles_public + guest_players) en batch
  const teamIds = [...new Set(registrations.map((r) => r.team_id).filter(Boolean) as string[])];
  const profileIds = [
    ...new Set(
      registrations
        .flatMap((r) => [r.player_one_id, r.player_two_id, r.player_id])
        .filter(Boolean) as string[],
    ),
  ];
  const guestIds = [
    ...new Set(
      [
        ...registrations.flatMap((r) => [
          r.guest_player_id,
          r.guest_player_one_id,
          r.guest_player_two_id,
        ]),
        ...matches.flatMap((m) => [
          m.pair_one_guest_one_id,
          m.pair_one_guest_two_id,
          m.pair_two_guest_one_id,
          m.pair_two_guest_two_id,
        ]),
      ].filter(Boolean) as string[],
    ),
  ];
  // profiles_public + guest_players: cast hasta regenerar types.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;
  const [teamsRes, profilesRes, guestsRes] = await Promise.all([
    teamIds.length
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? sb.from('profiles_public').select('id, display_name').in('id', profileIds)
      : Promise.resolve({ data: [] }),
    guestIds.length
      ? sb.from('guest_players').select('id, display_name').in('id', guestIds)
      : Promise.resolve({ data: [] }),
  ]);
  const teamMap = new Map(
    ((teamsRes.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name]),
  );
  const profileMap = new Map(
    ((profilesRes.data ?? []) as { id: string; display_name: string }[]).map((x) => [
      x.id,
      x.display_name,
    ]),
  );
  const guestMap = new Map(
    ((guestsRes.data ?? []) as { id: string; display_name: string }[]).map((x) => [
      x.id,
      x.display_name,
    ]),
  );

  const slotLabel = (profileId: string | null, guestId: string | null): string => {
    if (profileId) return profileMap.get(profileId) ?? '?';
    if (guestId) return guestMap.get(guestId) ?? '?';
    return '?';
  };

  const labelOf = (reg: RegRow): string => {
    if (reg.team_id && teamMap.has(reg.team_id)) return teamMap.get(reg.team_id)!;
    if (
      reg.player_one_id ||
      reg.player_two_id ||
      reg.guest_player_one_id ||
      reg.guest_player_two_id
    ) {
      return `${slotLabel(reg.player_one_id, reg.guest_player_one_id)} / ${slotLabel(reg.player_two_id, reg.guest_player_two_id)}`;
    }
    if (reg.player_id) return profileMap.get(reg.player_id) ?? '?';
    if (reg.guest_player_id) return guestMap.get(reg.guest_player_id) ?? '?';
    return '?';
  };

  // ── Calcular top 3
  type PodiumEntry = { label: string; metric: string };
  let podium: PodiumEntry[] = [];
  const isRandom = t.format === 'americano_random';

  if (isRandom) {
    // Para guests usamos un id sintético "g:<guestId>" en computeAmericanoStandings
    // y al renderizar el label hacemos lookup en guestMap.
    const effectiveId = (profileId: string | null, guestId: string | null): string => {
      if (profileId) return profileId;
      if (guestId) return `g:${guestId}`;
      return '';
    };
    const labelForEffective = (id: string): string => {
      if (id.startsWith('g:')) return guestMap.get(id.slice(2)) ?? '?';
      return profileMap.get(id) ?? '?';
    };
    const results = matches
      .filter((m) => m.status === 'completed' && m.score_one != null && m.score_two != null)
      .map((m) => ({
        pairOnePlayerOneId: effectiveId(m.pair_one_player_one_id, m.pair_one_guest_one_id),
        pairOnePlayerTwoId: effectiveId(m.pair_one_player_two_id, m.pair_one_guest_two_id),
        pairTwoPlayerOneId: effectiveId(m.pair_two_player_one_id, m.pair_two_guest_one_id),
        pairTwoPlayerTwoId: effectiveId(m.pair_two_player_two_id, m.pair_two_guest_two_id),
        scoreOne: m.score_one as number,
        scoreTwo: m.score_two as number,
      }));
    const allPlayerIds = registrations
      .map((r) => effectiveId(r.player_id, r.guest_player_id))
      .filter(Boolean);
    const standings = computeAmericanoStandings(results, allPlayerIds);
    podium = standings.slice(0, 3).map((s) => ({
      label: labelForEffective(s.playerId),
      metric: `${s.points} PTS · ${s.wins}W`,
    }));
  } else {
    // Fijo: wins → diff → gamesFor (mismo orden que /live)
    type Standing = {
      regId: string;
      wins: number;
      diff: number;
      gamesFor: number;
    };
    const byReg = new Map<string, Standing>();
    for (const r of registrations) {
      byReg.set(r.id, { regId: r.id, wins: 0, diff: 0, gamesFor: 0 });
    }
    for (const m of matches) {
      if (m.status !== 'completed' || m.score_one == null || m.score_two == null) continue;
      const a = m.registration_one_id ? byReg.get(m.registration_one_id) : undefined;
      const b = m.registration_two_id ? byReg.get(m.registration_two_id) : undefined;
      if (!a || !b) continue;
      a.gamesFor += m.score_one;
      b.gamesFor += m.score_two;
      a.diff += m.score_one - m.score_two;
      b.diff += m.score_two - m.score_one;
      if (m.score_one > m.score_two) a.wins += 1;
      else if (m.score_two > m.score_one) b.wins += 1;
    }
    const ranked = [...byReg.values()].sort((x, y) => {
      if (y.wins !== x.wins) return y.wins - x.wins;
      if (y.diff !== x.diff) return y.diff - x.diff;
      return y.gamesFor - x.gamesFor;
    });
    const regById = new Map(registrations.map((r) => [r.id, r]));
    podium = ranked.slice(0, 3).map((s) => {
      const reg = regById.get(s.regId)!;
      const sign = s.diff > 0 ? '+' : '';
      return {
        label: labelOf(reg),
        metric: `${s.wins}W · ${sign}${s.diff} DIF`,
      };
    });
  }

  // Si no hay top 3 todavía, completamos con placeholders para no fallar el render.
  while (podium.length < 3) podium.push({ label: '—', metric: '—' });

  const isQueens =
    t.category_kind === 'queens_estandar' || t.category_kind === 'queens_suma';
  const accent = isQueens ? '#ec4899' : '#ffc53d';
  const accentDeep = isQueens ? '#831843' : '#7c4f05';
  const brandTail = isQueens ? 'QUEENS' : 'KING';

  const categoryLabel = t.category_kind.includes('suma')
    ? `SUMA ${t.min_sum}+`
    : t.category
      ? (CATEGORY_LABELS[t.category] ?? t.category).toUpperCase()
      : 'CATEGORÍA ABIERTA';

  const fonts = await loadShareFonts();

  const GOLD = accent;
  const SILVER = '#d1d5db';
  const BRONZE = '#cd7f32';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1920px',
          display: 'flex',
          flexDirection: 'column',
          padding: '110px 90px',
          background: '#0a0a0a',
          color: '#f1efea',
          fontFamily: 'Manrope, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glows */}
        <div
          style={{
            position: 'absolute',
            top: '-260px',
            right: '-200px',
            width: '1000px',
            height: '1000px',
            background: `radial-gradient(circle, ${accent}40 0%, transparent 65%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-380px',
            left: '-280px',
            width: '950px',
            height: '950px',
            background: `radial-gradient(circle, ${accentDeep}66 0%, transparent 65%)`,
            display: 'flex',
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '8px',
            background: accent,
            display: 'flex',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '22px',
            zIndex: 10,
          }}
        >
          <KingMark size={72} accent={accent} />
          <div
            style={{
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: '46px',
              letterSpacing: '-0.01em',
              display: 'flex',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: '#f1efea' }}>PADEL</span>
            <span style={{ color: accent }}>{brandTail}</span>
          </div>
        </div>

        {/* Champions banner */}
        <div
          style={{
            display: 'flex',
            marginTop: '120px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '16px 32px',
              borderRadius: '999px',
              background: `${accent}1A`,
              border: `2px solid ${accent}`,
              color: accent,
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '0.2em',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '999px',
                background: accent,
                display: 'flex',
              }}
            />
            CAMPEONES
          </div>
        </div>

        {/* Tournament name */}
        <div
          style={{
            fontFamily: 'ArchivoBlack, sans-serif',
            fontSize: t.name.length > 22 ? '110px' : '140px',
            lineHeight: 0.9,
            letterSpacing: '-0.035em',
            marginTop: '36px',
            textTransform: 'uppercase',
            zIndex: 10,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {t.name}
        </div>

        {/* Category */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '52px',
              height: '4px',
              background: accent,
              display: 'flex',
            }}
          />
          <div
            style={{
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: '40px',
              color: accent,
              letterSpacing: '-0.01em',
              display: 'flex',
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Podium (3 columns, 2nd-1st-3rd) */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 10,
          }}
        >
          <PodiumColumn
            place={2}
            color={SILVER}
            height={360}
            label={podium[1]!.label}
            metric={podium[1]!.metric}
          />
          <PodiumColumn
            place={1}
            color={GOLD}
            height={480}
            label={podium[0]!.label}
            metric={podium[0]!.metric}
            isWinner
          />
          <PodiumColumn
            place={3}
            color={BRONZE}
            height={280}
            label={podium[2]!.label}
            metric={podium[2]!.metric}
          />
        </div>

        {/* Footer URL */}
        <div
          style={{
            marginTop: '60px',
            paddingTop: '32px',
            borderTop: '2px solid rgba(241, 239, 234, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '22px',
              color: '#a8a6a0',
              letterSpacing: '0.22em',
              fontWeight: 700,
              display: 'flex',
            }}
          >
            RESULTADOS EN
          </div>
          <div
            style={{
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: '34px',
              color: accent,
              letterSpacing: '-0.01em',
              display: 'flex',
            }}
          >
            padelking.co
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts,
    },
  );
}

function PodiumColumn({
  place,
  color,
  height,
  label,
  metric,
  isWinner = false,
}: {
  place: 1 | 2 | 3;
  color: string;
  height: number;
  label: string;
  metric: string;
  isWinner?: boolean;
}) {
  // Trunca el nombre largo a 2 líneas razonables (Satori no soporta line-clamp).
  const truncated = label.length > 22 ? label.slice(0, 22) + '…' : label;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '300px',
        gap: '14px',
      }}
    >
      {/* Player name + metric (above column) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '12px',
          padding: '0 8px',
        }}
      >
        {isWinner && (
          <div
            style={{
              fontSize: '54px',
              display: 'flex',
              lineHeight: 1,
            }}
          >
            👑
          </div>
        )}
        <div
          style={{
            fontFamily: 'ArchivoBlack, sans-serif',
            fontSize: isWinner ? '32px' : '26px',
            color: '#f1efea',
            textAlign: 'center',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            display: 'flex',
            lineHeight: 1.05,
          }}
        >
          {truncated}
        </div>
        <div
          style={{
            fontSize: '20px',
            color: color,
            fontWeight: 700,
            letterSpacing: '0.12em',
            display: 'flex',
          }}
        >
          {metric}
        </div>
      </div>

      {/* Column */}
      <div
        style={{
          width: '300px',
          height: `${height}px`,
          background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 -8px 40px ${color}55`,
        }}
      >
        <div
          style={{
            fontFamily: 'ArchivoBlack, sans-serif',
            fontSize: '180px',
            color: '#0a0a0a',
            lineHeight: 1,
            letterSpacing: '-0.05em',
            display: 'flex',
          }}
        >
          {place}
        </div>
      </div>
    </div>
  );
}
