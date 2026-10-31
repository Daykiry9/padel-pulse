import { PriceTag } from '@/components/ui/price-tag';
import { formatShort } from '@/lib/format-date';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type TicketTournament = {
  name: string;
  starts_at: string;
  max_teams: number;
  price_per_team: number;
  taken: number;
};

/** Si el `next` del auth apunta a un torneo, lo trae con sus cupos ocupados. */
export async function getTournamentFromNext(next: string | undefined): Promise<TicketTournament | null> {
  const slug = next?.match(/^\/tournaments\/([^/?#]+)/)?.[1];
  if (!slug) return null;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('id, name, starts_at, max_teams, price_per_team, status')
    .eq('slug', slug)
    .maybeSingle();
  const t = data as (Omit<TicketTournament, 'taken'> & { id: string; status: string }) | null;
  if (!t || t.status !== 'open') return null;
  const { count } = await supabase
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', t.id)
    .eq('status', 'confirmed');
  return { ...t, taken: Math.min(count ?? 0, t.max_teams) };
}

/**
 * "Boleta" del torneo en login/signup. Quien toca "Inscribirme" sin cuenta
 * caia en un formulario generico sin rastro del torneo que lo trajo; esto le
 * recuerda que esta a un paso de su cupo (y cuantos quedan).
 */
export function TournamentTicket({ tournament: t }: { tournament: TicketTournament }) {
  const left = t.max_teams - t.taken;
  const almostFull = left > 0 && left <= Math.max(2, Math.ceil(t.max_teams * 0.25));
  return (
    <div className="border-crown/40 bg-crown/[0.05] relative overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 text-[10px] uppercase tracking-widest">
        <span className="text-crown">Paso 1 de 2 · Tu cuenta</span>
        <span className="text-muted-foreground">Luego, tu inscripción</span>
      </div>
      <div className="px-4 pb-3 pt-2">
        <div className="font-display line-clamp-2 text-xl leading-tight tracking-tight">{t.name.toUpperCase()}</div>
        <div className="text-muted-foreground mt-0.5 flex items-baseline justify-between gap-3 text-xs">
          <span>{formatShort(t.starts_at)}</span>
          <PriceTag value={t.price_per_team} />
        </div>
      </div>
      {/* Linea perforada de boleta */}
      <div className="border-crown/30 mx-4 border-t border-dashed" aria-hidden />
      <div className="space-y-2 px-4 py-3">
        <div className="flex gap-0.5" aria-hidden>
          {Array.from({ length: t.max_teams }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < t.taken ? (almostFull ? 'bg-live' : 'bg-crown') : 'bg-muted'}`}
            />
          ))}
        </div>
        <div className={`text-xs uppercase tracking-widest ${almostFull ? 'text-live font-semibold' : 'text-muted-foreground'}`}>
          {left <= 0 ? 'Cupo completo' : left === 1 ? '¡Queda 1 cupo!' : almostFull ? `¡Quedan ${left} cupos!` : `Quedan ${left} cupos`}
        </div>
      </div>
    </div>
  );
}
