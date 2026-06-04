import { ImageResponse } from 'next/og';

import { CATEGORY_LABELS } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadShareFonts } from '@/lib/share-fonts';
import { KingMark } from '@/lib/share/king-mark';

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
  const brandTail = isQueens ? 'QUEENS' : 'KING';

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
  const dateTimeStr = `${dateStr} · ${timeStr}`.toUpperCase();
  const venueStr = t.clubs ? `${t.clubs.name} · ${t.clubs.city}` : null;
  const priceStr =
    t.price_per_team > 0 ? `$${t.price_per_team.toLocaleString('es-CO')} COP` : 'GRATIS';
  const inviteUrl = `padelking.co/tournaments/${slug}`;

  const statusLabel =
    t.status === 'finished'
      ? 'TORNEO FINALIZADO'
      : t.status === 'in_progress'
        ? 'TORNEO EN CURSO'
        : 'INSCRIPCIONES ABIERTAS';

  const fonts = await loadShareFonts();

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
        {/* Glow decoration: top-right + bottom-left */}
        <div
          style={{
            position: 'absolute',
            top: '-280px',
            right: '-260px',
            width: '1100px',
            height: '1100px',
            background: `radial-gradient(circle, ${accent}33 0%, transparent 65%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-340px',
            left: '-260px',
            width: '900px',
            height: '900px',
            background: `radial-gradient(circle, ${accentDeep}55 0%, transparent 65%)`,
            display: 'flex',
          }}
        />

        {/* Diagonal scan lines decoration */}
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

        {/* Header brand */}
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

        {/* Status pill */}
        <div
          style={{
            display: 'flex',
            marginTop: '140px',
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
              letterSpacing: '0.18em',
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
            {statusLabel}
          </div>
        </div>

        {/* Tournament name (display font, huge, tight) */}
        <div
          style={{
            fontFamily: 'ArchivoBlack, sans-serif',
            fontSize: t.name.length > 22 ? '120px' : '150px',
            lineHeight: 0.9,
            letterSpacing: '-0.035em',
            marginTop: '44px',
            textTransform: 'uppercase',
            zIndex: 10,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {t.name}
        </div>

        {/* Category accent line */}
        <div
          style={{
            marginTop: '50px',
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '4px',
              background: accent,
              display: 'flex',
            }}
          />
          <div
            style={{
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: '54px',
              color: accent,
              letterSpacing: '-0.01em',
              display: 'flex',
            }}
          >
            {categoryLabel}
          </div>
        </div>

        {/* Details bottom block */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '36px',
            zIndex: 10,
          }}
        >
          {/* Date */}
          <DetailRow label="FECHA" value={dateTimeStr} />
          {venueStr && <DetailRow label="SEDE" value={venueStr} />}
          <DetailRow label="ENTRADA" value={priceStr} />

          {/* CTA card */}
          <div
            style={{
              marginTop: '40px',
              padding: '36px 40px',
              border: `2px solid ${accent}`,
              borderRadius: '20px',
              background: `${accent}10`,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
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
              INSCRÍBETE EN
            </div>
            <div
              style={{
                fontFamily: 'ArchivoBlack, sans-serif',
                fontSize: '52px',
                color: accent,
                letterSpacing: '-0.01em',
                display: 'flex',
              }}
            >
              {inviteUrl}
            </div>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
        {label}
      </div>
      <div
        style={{
          fontSize: '46px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '-0.005em',
          color: '#f1efea',
          display: 'flex',
        }}
      >
        {value}
      </div>
    </div>
  );
}
