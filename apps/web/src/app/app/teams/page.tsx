import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { ShareInviteButton } from '@/components/share-invite-button';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function TeamsPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const { data: members } = await supabase
    .from('team_members')
    .select('team_id, teams(id, name, slug, category, rating, communities(name, slug))')
    .eq('profile_id', user.id)
    .eq('is_active', true);

  type TeamRow = {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    rating: number;
    communities: { name: string; slug: string } | null;
  };
  const teams = ((members ?? []) as unknown as { teams: TeamRow | null }[])
    .map((m) => m.teams)
    .filter((t): t is TeamRow => t !== null);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="crown">Mi pareja</Badge>
          <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            MIS EQUIPOS
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Tu pareja oficial. Acumula ranking de equipo en Tier 1 además de tu ranking individual.
          </p>
        </div>
        {teams.length > 0 && (
          <Button variant="crown" asChild>
            <Link href="/app/teams/new">
              <Plus className="size-4" />
              Nuevo equipo
            </Link>
          </Button>
        )}
      </header>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="¿Necesitas un equipo?"
          description="Solo si juegas SIEMPRE con la misma pareja y quieren competir en el ranking de equipo. Si jugas con varios compañeros, inscríbete ad-hoc cada vez al inscribirte a un torneo — no necesitas equipo."
          bullets={[
            'Juegas SIEMPRE con la misma pareja',
            'Quieren competir en el ranking de equipo separado',
            'Quieren inscribirse a torneos Tier 1 como equipo registrado',
          ]}
          primaryAction={
            <Button variant="crown" asChild>
              <Link href="/app/teams/new">
                <Plus className="size-4" />
                Crear equipo
              </Link>
            </Button>
          }
          secondaryAction={
            <Button variant="ghost" asChild>
              <Link href="/tournaments">Ver torneos primero</Link>
            </Button>
          }
          preview={
            <Card className="border-gold-400/30 from-gold-400/[0.04] bg-gradient-to-br to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <Avatar seed="ejemplo-a" name="Andrés Mejía" size="default" ring />
                  <Avatar seed="ejemplo-b" name="Juan Rodríguez" size="default" ring />
                </div>
                <div>
                  <div className="font-display text-sm tracking-tight">MEJÍA / RODRÍGUEZ</div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    3ra · Bogotá Circuit
                  </div>
                </div>
              </div>
              <div className="border-border/40 mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <div>
                  <div className="font-display text-gold-400 text-lg tabular-nums">487</div>
                  <div className="text-muted-foreground text-[9px] uppercase tracking-widest">pts</div>
                </div>
                <div>
                  <div className="font-display text-lg tabular-nums">18</div>
                  <div className="text-muted-foreground text-[9px] uppercase tracking-widest">torneos</div>
                </div>
                <div>
                  <div className="font-display text-success text-lg tabular-nums">71%</div>
                  <div className="text-muted-foreground text-[9px] uppercase tracking-widest">wins</div>
                </div>
              </div>
            </Card>
          }
        />
      ) : (
        <Section>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <Card
                key={t.id}
                className="border-gold-400/20 from-gold-400/[0.03] hover:border-gold-400/40 group h-full overflow-hidden bg-gradient-to-br to-transparent p-5 transition-[border-color,background-color] duration-[var(--duration-base)]"
              >
                <div className="flex items-start justify-between">
                  <AvatarGroup
                    avatars={[
                      { seed: `${t.slug}-1`, name: t.name.split(/[/-]/)[0]?.trim() },
                      { seed: `${t.slug}-2`, name: t.name.split(/[/-]/)[1]?.trim() ?? t.name },
                    ]}
                    max={2}
                    size="default"
                  />
                  {t.category && <CategoryBadge kind="category" category={t.category} size="sm" />}
                </div>

                <h3 className="font-display mt-4 line-clamp-2 text-lg tracking-tight">
                  {t.name}
                </h3>

                {t.communities && (
                  <div className="text-muted-foreground mt-1 text-[10px] uppercase tracking-widest">
                    {t.communities.name}
                  </div>
                )}

                <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-gold-400 text-2xl tabular-nums tracking-tight">
                      {t.rating}
                    </span>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                      rating
                    </span>
                  </div>
                  <ShareInviteButton
                    kind="team"
                    targetId={t.id}
                    name={t.name}
                    variant="outline"
                    size="sm"
                    label="Invitar"
                  />
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
