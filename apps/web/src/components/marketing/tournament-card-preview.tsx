import { Calendar, MapPin, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TournamentCardPreview() {
  return (
    <Card className="bg-card relative overflow-hidden">
      <div className="from-court via-court/80 to-pulse aspect-[5/3] bg-gradient-to-br p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/70">
              Presentado por
            </div>
            <div className="font-display text-2xl font-bold text-white">Águila Light</div>
          </div>
          <Badge variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur">
            Inscripciones abiertas
          </Badge>
        </div>
        <div className="mt-12">
          <div className="font-display text-3xl font-bold text-white">Copa Padel Pulse</div>
          <div className="font-display text-3xl font-bold text-white">Bogotá · Junio 2026</div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <Info icon={Calendar} label="Fecha" value="Sáb 14 Jun · 9:00am" />
          <Info icon={MapPin} label="Club" value="La Pala — Usaquén" />
          <Info icon={Users} label="Formato" value="Americano · 16 parejas" />
          <Info icon={Trophy} label="Premio" value="$3M COP + paletas" />
        </div>

        <div className="border-border/40 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-muted-foreground text-xs">Cupos restantes</div>
            <div className="font-display text-lg font-semibold">
              <span className="text-pulse">7</span> / 16 parejas
            </div>
          </div>
          <Button variant="pulse" size="sm">
            Inscribir comunidad
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
