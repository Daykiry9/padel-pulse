import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarGroup } from '@/components/ui/avatar';
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
    .select('team_id, teams(id, name, slug, category, rating, primary_community_id, communities(name, slug))')
    .eq('profile_id', user.id)
    .eq('is_active', true);

  type TeamRow = {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    rating: number;
    primary_community_id: string;
    communities: { name: string; slug: string } | null;
  };
  const teams = ((members ?? []) as unknown as { teams: TeamRow | null }[])
    .map((m) => m.teams)
    .filter((t): t is TeamRow => t !== null);

  // Agrupar por comunidad preservando el orden de aparición.
  const groups = new Map<string, { name: string; slug: string | null; teams: TeamRow[] }>();
  for (const t of teams) {
    const key = t.primary_community_id;
    const existing = groups.get(key);
    if (existing) {
      existing.teams.push(t);
    } else {
      groups.set(key, {
        name: t.communities?.name ?? 'Comunidad',
        slug: t.communities?.slug ?? null,
        teams: [t],
      });
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="crown">Mi pareja</Badge>
          <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            MIS EQUIPOS
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">
            Tus equipos viven dentro de comunidades. Crea uno nuevo desde el tab Equipos de la
            comunidad donde quieras competir.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app/communities">
            Ir a mis comunidades
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no tienes equipos"
          description="Los equipos se crean dentro de una comunidad. Entra a la comunidad donde juegas siempre con la misma pareja y crea el equipo desde su tab Equipos."
          bullets={[
            'Juegas SIEMPRE con la misma pareja',
            'Quieren competir en el ranking de equipo separado',
            'Quieren inscribirse a torneos Tier 1 como equipo registrado',
          ]}
          primaryAction={
            <Button variant="crown" asChild>
              <Link href="/app/communities">
                Ir a mis comunidades
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {Array.from(groups.entries()).map(([communityId, group]) => (
            <Section key={communityId}>
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl tracking-tight uppercase">{group.name}</h2>
                {group.slug && (
                  <Link
                    href={`/app/communities/${group.slug}?tab=teams`}
                    className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-widest transition-colors"
                  >
                    Ver comunidad
                  </Link>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {group.teams.map((t) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
