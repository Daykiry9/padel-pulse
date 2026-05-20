import { ChevronUp, Trophy } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const entries = [
  { rank: 1, name: 'La Pala', city: 'Bogotá', pts: 2148, delta: 32, badge: '🏆' },
  { rank: 2, name: 'Spimpad', city: 'Bogotá', pts: 2096, delta: 18 },
  { rank: 3, name: 'Valkiria', city: 'Bogotá', pts: 1942, delta: 12 },
  { rank: 4, name: 'Globo Crew', city: 'Bogotá', pts: 1820, delta: 8 },
  { rank: 5, name: 'El Parche', city: 'Medellín', pts: 1755, delta: 24 },
  { rank: 6, name: 'Smashers', city: 'Cali', pts: 1689, delta: -4 },
];

export function CommunityRankingPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="border-border/40 flex items-center justify-between border-b bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="text-pulse size-4" />
          <span className="font-display text-sm font-semibold">Ranking nacional</span>
        </div>
        <div className="flex gap-1">
          {['Mes', 'Trim', 'Sem', 'Año'].map((p, i) => (
            <Badge key={p} variant={i === 3 ? 'pulse' : 'muted'} className="text-[10px]">
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
              className={`font-display w-6 text-center text-lg font-bold ${
                e.rank === 1 ? 'text-pulse' : e.rank <= 3 ? 'text-court' : 'text-muted-foreground'
              }`}
            >
              {e.rank}
            </div>
            <div className="from-court to-pulse size-9 shrink-0 rounded-lg bg-gradient-to-br" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-display truncate font-semibold">{e.name}</div>
                {e.badge && <span className="text-sm">{e.badge}</span>}
              </div>
              <div className="text-muted-foreground text-xs">{e.city}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-semibold tabular-nums">{e.pts}</div>
              <div
                className={`flex items-center justify-end gap-0.5 text-[10px] ${
                  e.delta >= 0 ? 'text-smash-foreground' : 'text-destructive'
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
