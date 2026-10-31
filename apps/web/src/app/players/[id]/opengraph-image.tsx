import { ImageResponse } from 'next/og';

import { CATEGORY_LABELS_SHORT } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadShareFonts } from '@/lib/share-fonts';
import { KingMark } from '@/lib/share/king-mark';

// Preview del link del perfil: la carta del jugador, para que compartirla en
// WhatsApp muestre el ELO y la categoria en vez de la tarjeta generica.
export const runtime = 'nodejs';
export const alt = 'Carta de jugador en PadelKing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;
  const { data } = await sb
    .from('profiles_public')
    .select('display_name, city, skill_category, gender, elo_rating')
    .eq('id', id)
    .maybeSingle();
  const p = data as {
    display_name: string;
    city: string | null;
    skill_category: string | null;
    gender: string | null;
    elo_rating: number | null;
  } | null;
  const fonts = await loadShareFonts();
  if (!p) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a' }} />, {
      ...size,
      fonts,
    });
  }

  const isQueens = p.gender === 'female' && Boolean(p.skill_category?.startsWith('queens_'));
  const accent = isQueens ? '#ec4899' : '#ffc53d';
  const elo = p.elo_rating ?? 1000;
  const cat = p.skill_category ? (CATEGORY_LABELS_SHORT[p.skill_category] ?? p.skill_category).toUpperCase() : '';
  const initials = p.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const level = elo < 1000 ? 'ROOKIE' : elo < 1400 ? 'INTERMEDIO' : 'AVANZADO';
  const subtitle = p.city ? `${p.city.toUpperCase()} · ${level}` : level;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '64px',
          padding: '0 80px',
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
            top: '-300px',
            left: '-200px',
            width: '900px',
            height: '900px',
            background: `radial-gradient(circle, ${accent}30 0%, transparent 65%)`,
            display: 'flex',
          }}
        />

        {/* Carta */}
        <div
          style={{
            width: '380px',
            height: '520px',
            borderRadius: '36px',
            border: `3px solid ${accent}`,
            background: `${accent}12`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '76px', lineHeight: 1, color: accent, display: 'flex' }}>
                {String(elo)}
              </div>
              <div style={{ fontSize: '18px', letterSpacing: '0.2em', color: '#a8a6a0', fontWeight: 800, display: 'flex' }}>ELO</div>
              {cat && (
                <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '34px', color: accent, marginTop: '12px', display: 'flex' }}>
                  {cat}
                </div>
              )}
            </div>
            <KingMark size={44} accent={accent} />
          </div>
          <div
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '999px',
              border: `3px solid ${accent}`,
              background: `${accent}1A`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: '64px',
              marginTop: '-10px',
            }}
          >
            {initials}
          </div>
          <div
            style={{
              fontFamily: 'ArchivoBlack, sans-serif',
              fontSize: p.display_name.length > 16 ? '30px' : '38px',
              marginTop: '28px',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            {p.display_name.toUpperCase()}
          </div>
        </div>

        {/* Texto */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '32px', display: 'flex' }}>
            <span>PADEL</span>
            <span style={{ color: accent }}>{isQueens ? 'QUEENS' : 'KING'}</span>
          </div>
          <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '72px', lineHeight: 0.95, marginTop: '28px', display: 'flex' }}>
            CARTA DE JUGADOR
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#a8a6a0', letterSpacing: '0.08em', marginTop: '24px', display: 'flex' }}>
            {subtitle}
          </div>
          <div style={{ fontFamily: 'ArchivoBlack, sans-serif', fontSize: '36px', color: accent, marginTop: '48px', display: 'flex' }}>
            ¿TE LE MIDES?
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
