import { Crown, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function LiveScoreboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-crown/25 via-transparent to-queens/15 blur-2xl" />
      <Card className="bg-card/80 overflow-hidden border-crown/20 backdrop-blur-xl">
        <div className="border-border/40 flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-live animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              EN VIVO · Cancha 3 · Bogotá Pádel Circuit
            </span>
          </div>
          <Badge variant="crown" className="text-[10px]">
            <Trophy className="size-3" />
            Copa Apertura
          </Badge>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-6">
          <TeamRow
            name="Mejía / Rodríguez"
            community="Bogotá Pádel Circuit"
            category="3ra"
            score={5}
            winning
          />
          <div className="text-muted-foreground/60 font-mono text-xs">VS</div>
          <TeamRow
            name="Ruiz / Peña"
            community="Norte Pádel Liga"
            category="3ra"
            score={3}
            winning={false}
            reverse
          />
        </div>

        <div className="border-border/40 bg-muted/40 grid grid-cols-3 gap-3 border-t px-5 py-4 text-xs">
          <Stat label="Ronda" value="4 / 7" />
          <Stat label="Tiempo" value="18:42" />
          <Stat label="Próxima" value="Globo · 19:30" />
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { name: 'Bogotá P.C.', pts: 1248, trend: '+32' },
          { name: 'Norte P.L.', pts: 1196, trend: '+18' },
          { name: 'Antioquia', pts: 1142, trend: '+8' },
        ].map((c, i) => (
          <Card key={c.name} className="bg-card/60 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-1">
              <Crown
                className={i === 0 ? 'text-crown size-3' : 'text-muted-foreground/30 size-3'}
              />
              <span className="text-muted-foreground font-mono text-[10px]">#{i + 1}</span>
            </div>
            <div className="font-display text-sm tracking-tight mt-1">{c.name}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-crown font-mono text-xs">{c.pts}</span>
              <span className="text-success font-mono text-[10px]">{c.trend}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TeamRow({
  name,
  community,
  category,
  score,
  winning,
  reverse,
}: {
  name: string;
  community: string;
  category: string;
  score: number;
  winning: boolean;
  reverse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      <div className="bg-gradient-to-br from-crown to-queens size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm tracking-tight uppercase truncate">{name}</div>
        <div className="text-muted-foreground truncate text-[10px] uppercase tracking-wider">
          {category} · {community}
        </div>
      </div>
      <div
        className={`font-display text-4xl font-bold tabular-nums ${
          winning ? 'text-crown' : 'text-muted-foreground'
        }`}
      >
        {score}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-[9px] uppercase tracking-widest">{label}</div>
      <div className="font-mono text-sm mt-0.5">{value}</div>
    </div>
  );
}
