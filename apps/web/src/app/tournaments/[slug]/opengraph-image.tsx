import { ImageResponse } from 'next/og';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadShareFonts } from '@/lib/share-fonts';
import { KingMark } from '@/lib/share/king-mark';

// Preview del link cuando se pega en WhatsApp / iMessage / redes. Antes todos
// los torneos mostraban la misma tarjeta generica de PadelKing; ahora cada uno
// muestra su nombre, fecha, precio y cuantos cupos quedan. Hereda a /live.
export const runtime = 'nodejs';
export const alt = 'Torneo en PadelKing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TZ = 'America/Bogota';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();

  type Row = {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    category_kind: string;
    max_teams: number;
    price_per_team: number;
  };
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, status, starts_at, category_kind, max_teams, price_per_team')
    .eq('slug', slug)
    .single();
  const t = data as unknown as Row | null;

  const fonts = await loadShareFonts();
  if (!t) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a' }} />, {
      ...size,
      fonts,
    });
  }

  const { count } = await supabase
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', t.id);
  const taken = Math.min(count ?? 0, t.max_teams);
  const left = t.max_teams - taken;

  const isQueens = t.category_kind === 'queens_estandar' || t.category_kind === 'queens_suma';
  const accent = isQueens ? '#ec4899' : '#ffc53d';
  const urgent = '#ff4d6d';
  const almostFull = left > 0 && left <= Math.max(2, Math.ceil(t.max_teams * 0.25));
  const barColor = almostFull ? urgent : accent;

  const when = new Date(t.starts_at);
  const dateStr = `${when.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })} · ${when.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: TZ })}`.toUpperCase();
  const priceStr = t.price_per_team > 0 ? `$${t.price_per_team.toLocaleString('es-CO')}` : 'GRATIS';
  const headline =
    t.status === 'in_progress'
      ? 'EN VIVO AHORA'
      : t.status === 'finished'
        ? 'TORNEO FINALIZADO'
        : left === 0
          ? 'CUPO COMPLETO'
          : left === 1
            ? '¡QUEDA 1 CUPO!'
            : `${almostFull ? '¡' : ''}QUEDAN ${left} CUPOS${almostFull ? '!' : ''}`;
  const headlineColor = t.status === 'in_progress' || almostFull ? urgent : accent;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px',
          background: '#0a0a0a',
          color: '#f1efea',
          fontFamily: 'Manrope, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-320px',
            right: '-220px',
            width: '900px',
            height: '900px',
            background: `radial-gradient(circle, ${accent}2E 0%, transparent 65%)`,
            display: 'flex',
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: accent, display: 'flex' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <KingMark size={48} accent={accent} />
            <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '32px', display: 'flex' }}>
              <span>PADEL</span>
              <span style={{ color: accent }}>{isQueens ? 'QUEENS' : 'KING'}</span>
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '0.12em', color: '#a8a6a0', display: 'flex' }}>
            {dateStr}
          </div>
        </div>

        <div
          style={{
            fontFamily: 'ArchivoBlack, sans-serif',
            fontSize: t.name.length > 26 ? '72px' : '92px',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            marginTop: '48px',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {t.name}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '48px', color: headlineColor, display: 'flex' }}>
              {headline}
            </div>
            <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '44px', display: 'flex' }}>{priceStr}</div>
          </div>
          {t.status === 'open' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: t.max_teams }, (_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '18px',
                    borderRadius: '999px',
                    background: i < taken ? barColor : '#26262b',
                    display: 'flex',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
