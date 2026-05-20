import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function LiveScoreboardPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-court/30 via-transparent to-pulse/30 blur-2xl" />
      <Card className="bg-card/80 overflow-hidden border-court/20 backdrop-blur-xl">
        <div className="border-border/40 flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-smash animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              EN VIVO · Cancha 3 · Club La Pala
            </span>
          </div>
          <Badge variant="pulse" className="text-[10px]">
            <Trophy className="size-3" />
            Copa Padel Pulse
          </Badge>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-6">
          <TeamRow name="Spimpad A" players={['J. Vergara', 'A. Mejía']} score={5} winning />
          <div className="text-muted-foreground/60 font-mono text-xs">VS</div>
          <TeamRow name="Valkiria" players={['C. Ruiz', 'M. Peña']} score={3} winning={false} reverse />
        </div>

        <div className="border-border/40 bg-muted/40 grid grid-cols-3 gap-3 border-t px-5 py-4 text-xs">
          <Stat label="Ronda" value="4 / 7" />
          <Stat label="Tiempo" value="18:42" />
          <Stat label="Próxima" value="Globo · 19:30" />
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { name: 'La Pala', pts: 1248 },
          { name: 'Spimpad', pts: 1196 },
          { name: 'Valkiria', pts: 1142 },
        ].map((c, i) => (
          <Card key={c.name} className="bg-card/60 px-4 py-3 backdrop-blur">
            <div className="text-muted-foreground font-mono text-[10px]">#{i + 1}</div>
            <div className="font-display text-sm font-semibold">{c.name}</div>
            <div className="text-court font-mono text-xs">{c.pts} pts</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TeamRow({
  name,
  players,
  score,
  winning,
  reverse,
}: {
  name: string;
  players: string[];
  score: number;
  winning: boolean;
  reverse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${reverse ? 'flex-row-reverse text-right' : ''}`}>
      <div className="bg-gradient-to-br from-court to-pulse size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="font-display truncate text-base font-semibold">{name}</div>
        <div className="text-muted-foreground truncate text-xs">{players.join(' · ')}</div>
      </div>
      <div
        className={`font-display text-4xl font-bold tabular-nums ${
          winning ? 'text-pulse' : 'text-muted-foreground'
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
      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
