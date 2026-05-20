import { ChevronUp, Crown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const entries = [
  { rank: 1, name: 'Bogotá Pádel Circuit', city: 'Bogotá', pts: 2148, delta: 32, crown: true },
  { rank: 2, name: 'Norte Pádel Liga', city: 'Bogotá', pts: 2096, delta: 18 },
  { rank: 3, name: 'Antioquia Pádel', city: 'Medellín', pts: 1942, delta: 24 },
  { rank: 4, name: 'Valkiria Queens', city: 'Bogotá', pts: 1820, delta: 12, queens: true },
  { rank: 5, name: 'Spimpad', city: 'Bogotá', pts: 1755, delta: 8 },
  { rank: 6, name: 'Pacífico Crew', city: 'Cali', pts: 1689, delta: -4 },
];

export function CommunityRankingPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="border-border/40 flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <Crown className="text-crown size-4" />
          <span className="font-display text-sm tracking-tight uppercase">Ranking nacional</span>
        </div>
        <div className="flex gap-1">
          {['Mes', 'Trim', 'Sem', 'Año'].map((p, i) => (
            <Badge key={p} variant={i === 3 ? 'crown' : 'muted'} className="text-[9px]">
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="divide-border/30 divide-y">
        {entries.map((e) => (
          <div
            key={e.rank}
            className="hover:bg-muted/40 flex items-center gap-4 px-5 py-3 transition-colors"
          >
            <div
              className={`font-display w-6 text-center text-lg ${
                e.rank === 1 ? 'text-crown' : e.rank <= 3 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {e.rank}
            </div>
            <div
              className={`size-9 shrink-0 rounded-lg bg-gradient-to-br ${
                e.queens ? 'from-queens to-pink-900' : 'from-crown to-amber-900'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-display text-sm tracking-tight uppercase truncate">
                  {e.name}
                </div>
                {e.crown && <Crown className="text-crown size-3.5 shrink-0" />}
                {e.queens && (
                  <Badge variant="queens" className="text-[9px] shrink-0">
                    Queens
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {e.city}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm tabular-nums">{e.pts}</div>
              <div
                className={`flex items-center justify-end gap-0.5 text-[10px] ${
                  e.delta >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {e.delta >= 0 ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronUp className="size-3 rotate-180" />
                )}
                {Math.abs(e.delta)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
