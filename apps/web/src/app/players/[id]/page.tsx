import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Crown, Hand, Instagram, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PublicHeader } from '@/components/public-header';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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

type Ranking = {
  total_points: number;
  tournaments_played: number;
  raw_tier1_points: number;
  raw_tier2_points: number;
};

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: profileData } = await supabase
    .from('profiles')
    .select(
      'id, display_name, city, skill_category, gender, instagram_handle, dominant_hand, favorite_position, playing_since_year, elo_rating',
    )
    .eq('id', id)
    .maybeSingle();
  const player = profileData as unknown as PublicProfile | null;
  if (!player) notFound();

  const { data: rankingData } = await supabase
    .from('player_ranking_consolidated')
    .select('total_points, tournaments_played, raw_tier1_points, raw_tier2_points')
    .eq('profile_id', id)
    .maybeSingle();
  const ranking = rankingData as unknown as Ranking | null;

  const isQueens = player.gender === 'female' && player.skill_category?.startsWith('queens_');
  const yearsPlaying = player.playing_since_year
    ? new Date().getFullYear() - player.playing_since_year
    : null;

  return (
    <div className={`bg-background min-h-screen ${isQueens ? 'theme-queens' : ''}`}>
      <PublicHeader brand={isQueens ? 'queens' : 'kings'} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="space-y-2">
          {player.skill_category && (
            <Badge variant={isQueens ? 'queens' : 'crown'}>
              {CATEGORY_LABELS[player.skill_category] ?? player.skill_category}
            </Badge>
          )}
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            {player.display_name.toUpperCase()}
          </h1>
          {player.city && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5" />
              {player.city}
            </p>
          )}
        </div>

        {/* Stats principales */}
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <Card className={`p-5 ${isQueens ? 'border-queens/30 bg-queens/[0.04]' : 'border-crown/30 bg-crown/[0.04]'}`}>
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              ELO individual
            </div>
            <div className={`font-display mt-1 text-4xl tabular-nums tracking-tight ${isQueens ? 'text-queens' : 'text-crown'}`}>
              {player.elo_rating ?? 1000}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {player.elo_rating < 1000 ? 'Rookie' : player.elo_rating < 1400 ? 'Intermedio' : 'Avanzado'}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Puntos ranking
            </div>
            <div className="font-display mt-1 text-4xl tabular-nums tracking-tight">
              {(ranking?.total_points ?? 0).toLocaleString('es-CO')}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              últimos 12 meses
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Torneos
            </div>
            <div className="font-display mt-1 text-4xl tabular-nums tracking-tight">
              {ranking?.tournaments_played ?? 0}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              últimos 12 meses
            </div>
          </Card>
        </div>

        {/* Detalles del jugador */}
        <Card className="mt-6 p-6">
          <h2 className="font-display mb-4 text-lg tracking-tight">PERFIL DE JUEGO</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {player.dominant_hand && (
              <DetailRow icon={Hand} label="Mano dominante" value={HAND_LABELS[player.dominant_hand] ?? player.dominant_hand} />
            )}
            {player.favorite_position && (
              <DetailRow icon={Crown} label="Posición preferida" value={POSITION_LABELS[player.favorite_position] ?? player.favorite_position} />
            )}
            {yearsPlaying !== null && (
              <DetailRow icon={Calendar} label="Años jugando" value={`${yearsPlaying} años (desde ${player.playing_since_year})`} />
            )}
            {player.instagram_handle && (
              <DetailRow
                icon={Instagram}
                label="Instagram"
                value={
                  <Link
                    href={`https://instagram.com/${player.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-crown hover:underline"
                  >
                    @{player.instagram_handle}
                  </Link>
                }
              />
            )}
          </dl>
        </Card>

        {/* Desglose ranking */}
        {ranking && ranking.total_points > 0 && (
          <Card className="mt-6 p-6">
            <h2 className="font-display mb-4 text-lg tracking-tight">DESGLOSE DE RANKING</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-border/40 rounded-lg border p-3">
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  Tier 1 (oficiales · x1.0)
                </div>
                <div className="font-display mt-1 text-2xl tabular-nums text-crown">
                  {ranking.raw_tier1_points.toLocaleString('es-CO')}
                </div>
              </div>
              <div className="border-border/40 rounded-lg border p-3">
                <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  Tier 2 (casuales · x0.5)
                </div>
                <div className="font-display mt-1 text-2xl tabular-nums text-data">
                  {ranking.raw_tier2_points.toLocaleString('es-CO')}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="text-muted-foreground mt-8 text-center text-xs">
          Perfil público de PadelKing.{' '}
          <Link href="/rankings" className="text-crown hover:underline">
            Ver ranking nacional
          </Link>
        </div>
      </main>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
