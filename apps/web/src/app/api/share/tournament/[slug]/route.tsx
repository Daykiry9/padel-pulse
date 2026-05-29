import { ImageResponse } from 'next/og';

import { CATEGORY_LABELS } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const TZ = 'America/Bogota';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  type Row = {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    category_kind: string;
    category: string | null;
    min_sum: number | null;
    tier: string;
    max_teams: number;
    price_per_team: number;
    clubs: { name: string; city: string } | null;
  };
  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, name, status, starts_at, category_kind, category, min_sum, tier, max_teams, price_per_team, clubs(name, city)',
    )
    .eq('slug', slug)
    .single();

  const t = data as unknown as Row | null;
  if (!t) {
    return new Response('Tournament not found', { status: 404 });
  }

  const isQueens =
    t.category_kind === 'queens_estandar' || t.category_kind === 'queens_suma';
  const accent = isQueens ? '#ec4899' : '#ffc53d';
  const accentDeep = isQueens ? '#831843' : '#7c4f05';
  const brand = isQueens ? 'PADELQUEENS' : 'PADELKING';

  const categoryLabel = t.category_kind.includes('suma')
    ? `SUMA ${t.min_sum}+`
    : t.category
      ? (CATEGORY_LABELS[t.category] ?? t.category).toUpperCase()
      : 'CATEGORÍA ABIERTA';

  const dateStr = new Date(t.starts_at).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: TZ,
  });
  const timeStr = new Date(t.starts_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
  // Satori exige que un <div> con >1 hijo tenga display:flex. Precomputamos
  // los textos compuestos como string único para evitarlo.
  const dateTimeStr = `${dateStr} · ${timeStr}`;
  const venueStr = t.clubs ? `${t.clubs.name} · ${t.clubs.city}` : null;
  const priceStr =
    t.price_per_team > 0 ? `$${t.price_per_team.toLocaleString('es-CO')} COP / equipo` : 'GRATIS';
  const inviteUrl = `padelking.co/tournaments/${slug}`;

  const statusLabel =
    t.status === 'finished'
      ? 'FINALIZADO'
      : t.status === 'in_progress'
        ? 'EN CURSO'
        : 'INSCRIPCIONES ABIERTAS';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1920px',
          display: 'flex',
          flexDirection: 'column',
          padding: '100px 80px',
          background: '#0a0a0a',
          color: '#f1efea',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Glow decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '900px',
            height: '900px',
            background: `radial-gradient(circle, ${accent}26 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-300px',
            left: '-200px',
            width: '700px',
            height: '700px',
            background: `radial-gradient(circle, ${accentDeep}40 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Header brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: accent,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 900,
              color: '#0a0a0a',
            }}
          >
            {brand.slice(5, 6)}
          </div>
          <div
            style={{
              fontSize: '38px',
              fontWeight: 900,
              letterSpacing: '0.02em',
              display: 'flex',
            }}
          >
            <span style={{ color: '#f1efea' }}>PADEL</span>
            <span style={{ color: accent }}>{brand.slice(5)}</span>
          </div>
        </div>

        {/* Status pill */}
        <div
          style={{
            display: 'flex',
            marginTop: '120px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: `${accent}22`,
              border: `2px solid ${accent}66`,
              color: accent,
              fontSize: '24px',
              fontWeight: 700,
              letterSpacing: '0.15em',
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* Tournament name */}
        <div
          style={{
            fontSize: '110px',
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            marginTop: '40px',
            textTransform: 'uppercase',
            zIndex: 10,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {t.name}
        </div>

        {/* Category big */}
        <div
          style={{
            marginTop: '60px',
            fontSize: '90px',
            fontWeight: 900,
            color: accent,
            letterSpacing: '-0.01em',
            zIndex: 10,
            display: 'flex',
          }}
        >
          {categoryLabel}
        </div>

        {/* Details bottom */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 10,
          }}
        >
          {/* Date row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
            <span style={{ fontSize: '20px', color: '#a8a6a0', letterSpacing: '0.18em', fontWeight: 600 }}>
              FECHA
            </span>
            <span style={{ fontSize: '40px', fontWeight: 700, textTransform: 'capitalize' }}>
              {dateTimeStr}
            </span>
          </div>

          {/* Venue */}
          {venueStr && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
              <span style={{ fontSize: '20px', color: '#a8a6a0', letterSpacing: '0.18em', fontWeight: 600 }}>
                SEDE
              </span>
              <span style={{ fontSize: '40px', fontWeight: 700 }}>{venueStr}</span>
            </div>
          )}

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
            <span style={{ fontSize: '20px', color: '#a8a6a0', letterSpacing: '0.18em', fontWeight: 600 }}>
              ENTRADA
            </span>
            <span style={{ fontSize: '40px', fontWeight: 700 }}>{priceStr}</span>
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: '60px',
              padding: '24px 32px',
              borderTop: '2px solid rgba(241, 239, 234, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '22px', color: '#a8a6a0', letterSpacing: '0.18em', fontWeight: 600 }}>
              INSCRÍBETE EN
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: accent }}>{inviteUrl}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    },
  );
}
