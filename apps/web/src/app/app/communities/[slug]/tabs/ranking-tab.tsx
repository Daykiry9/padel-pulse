import { cache } from 'react';
import { Crown, Trophy } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCommunityPlayerRanking,
  type CommunityRankingEntry,
} from '@/lib/community-ranking';
import { cn } from '@/lib/utils';

/**
 * Cache request-scoped: si Ranking y otro tab piden el ranking en el mismo
 * render, sólo se ejecuta una vez. (Server Supabase client lleva cookies, así
 * que no se puede usar `unstable_cache` cross-request sin desacoplar el client.)
 */
const getRankingCached = cache(
  async (communityId: string): Promise<CommunityRankingEntry[]> => {
    const supabase = await getSupabaseServerClient();
    return getCommunityPlayerRanking(supabase, communityId);
  },
);

interface RankingTabProps {
  communityId: string;
  communitySlug: string;
  isMember: boolean;
  currentUserId: string;
}

export async function RankingTab({
  communityId,
  isMember,
  currentUserId,
}: RankingTabProps) {
  const ranking = await getRankingCached(communityId);

  if (ranking.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Aún no hay ranking"
        description={
          isMember
            ? 'El ranking se construye con cada partido completado en torneos de la comunidad. Juega tu primer torneo para aparecer acá.'
            : 'Esta comunidad aún no completó partidos. Cuando se cierren los primeros torneos vas a ver el ranking interno por ELO.'
        }
        bullets={[
          'ELO interno calculado desde 1000.',
          'Se actualiza con cada partido completed.',
          'Top 20 jugadores ordenados por rating.',
        ]}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl tracking-tight">RANKING DE LA COMUNIDAD</h2>
        <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
          T · PJ · ELO · 7d
        </span>
      </div>

      <Card className="divide-border/30 divide-y overflow-hidden p-0">
        {ranking.map((row, idx) => {
          const isMe = row.playerId === currentUserId;
          const isTop = idx === 0;
          // Delta semanal: sin historial persistente todavía, mostramos 0.
          // Cuando exista snapshot semanal, sustituir por (elo_actual - elo_hace_7d).
          const delta = 0;
          return (
            <div
              key={row.playerId}
              className={cn(
                'grid grid-cols-[2rem_auto_1fr_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-sm',
                isTop && 'bg-crown/[0.04]',
                isMe && !isTop && 'bg-muted/30',
              )}
            >
              <span
                className={cn(
                  'font-display text-base tabular-nums',
                  isTop ? 'text-crown' : 'text-muted-foreground',
                )}
              >
                {idx + 1}
              </span>
              <Avatar seed={row.playerId} name={row.name} size="sm" />
              <span className="flex items-center gap-1 truncate">
                {isTop && <Crown className="text-crown size-3 shrink-0" />}
                <span className="truncate">{row.name}</span>
                {isMe && (
                  <span className="text-crown text-[9px] uppercase tracking-widest">· tú</span>
                )}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">
                {row.tournaments}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">{row.matches}</span>
              <span className="font-display tabular-nums">{row.elo}</span>
              <span
                className={cn(
                  'tabular-nums text-[10px]',
                  delta > 0
                    ? 'text-emerald-400'
                    : delta < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>
          );
        })}
      </Card>

      <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
        ELO interno · T = torneos · PJ = partidos · 7d = cambio semanal
      </p>
    </section>
  );
}

export { getRankingCached };
