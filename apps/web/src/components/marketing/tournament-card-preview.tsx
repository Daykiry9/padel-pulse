import { Calendar, Crown, MapPin, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TournamentCardPreview() {
  return (
    <Card className="bg-card relative overflow-hidden">
      <div className="relative aspect-[5/3] overflow-hidden bg-[radial-gradient(ellipse_at_top_left,rgba(255,197,61,0.45),rgba(10,10,10,0.95))] p-6">
        <div className="court-grid absolute inset-0 opacity-30" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/70">
              Presentado por
            </div>
            <div className="font-display text-2xl text-white">ÁGUILA LIGHT</div>
          </div>
          <Badge variant="success" className="bg-success/20 text-success backdrop-blur">
            Inscripciones abiertas
          </Badge>
        </div>
        <div className="relative mt-12 flex items-center gap-2">
          <Crown className="text-crown size-7" />
          <div className="font-display text-2xl tracking-tight text-white md:text-3xl">
            COPA APERTURA<br />
            <span className="text-crown">BOGOTÁ · JUN 2026</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <Info icon={Calendar} label="Fecha" value="Sáb 14 Jun · 9:00am" />
          <Info icon={MapPin} label="Club" value="La Pala — Usaquén" />
          <Info icon={Users} label="Formato" value="Americano · 3ra · 16 equipos" />
          <Info icon={Trophy} label="Premio" value="$3M COP + paletas" />
        </div>

        <div className="border-border/40 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
          <div>
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Cupos restantes
            </div>
            <div className="font-display text-lg">
              <span className="text-crown">7</span>{' '}
              <span className="text-muted-foreground">/ 16 equipos</span>
            </div>
          </div>
          <Button variant="crown" size="sm">
            Inscribir equipo
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
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}
