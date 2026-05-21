import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Crown, Globe, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/forms/form';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { joinCommunity } from '@/lib/community-actions';

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!community) notFound();

  const [membersRes, teamsRes, tournamentsRes, mineRes] = await Promise.all([
    supabase
      .from('community_members')
      .select('profile_id, role, profiles(display_name, skill_category)')
      .eq('community_id', community.id),
    supabase
      .from('teams')
      .select('id, name, slug, category, rating')
      .eq('primary_community_id', community.id)
      .eq('is_active', true),
    supabase
      .from('tournaments')
      .select('id, name, slug, format, status, starts_at, category, category_kind, min_sum')
      .eq('club_id', community.id) // shortcut MVP; real schema usa club aliado
      .limit(5),
    supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', community.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  const members = membersRes.data ?? [];
  const teams = teamsRes.data ?? [];
  const tournaments = tournamentsRes.data ?? [];
  const isMember = !!mineRes.data;

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <Badge variant="crown" className="mb-3">
            <Globe className="size-3" />
            {community.city}
          </Badge>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            {community.name.toUpperCase()}
          </h1>
          {community.description && (
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
              {community.description}
            </p>
          )}
          <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {members.length} miembros
            </span>
            <span>·</span>
            <span>Rating {community.rating}</span>
          </div>
        </div>
        {!isMember && (
          <Form action={joinCommunity}>
            {({ isPending }) => (
              <>
                <input type="hidden" name="community_id" value={community.id} />
                <Button type="submit" variant="crown" disabled={isPending}>
                  {isPending ? 'Uniéndome…' : 'Unirme'}
                </Button>
              </>
            )}
          </Form>
        )}
        {isMember && <Badge variant="success">Eres miembro</Badge>}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-tight">EQUIPOS</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/app/teams/new">
                <Plus className="size-3" />
                Nuevo
              </Link>
            </Button>
          </div>
          {teams.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Aún no hay equipos en esta comunidad.
            </Card>
          ) : (
            <div className="grid gap-2">
              {teams.map((t) => (
                <Card key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-sm">{t.name}</div>
                      <div className="text-muted-foreground text-xs uppercase tracking-widest">
                        {t.category ?? 'Mixto'} · rating {t.rating}
                      </div>
                    </div>
                    <Crown className="text-crown/30 size-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-tight">TORNEOS</h2>
          </div>
          {tournaments.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No hay torneos próximos en esta comunidad.
            </Card>
          ) : (
            <div className="grid gap-2">
              {tournaments.map((t) => (
                <Link key={t.id} href={`/tournaments/${t.slug}`}>
                  <Card className="hover:border-crown/40 px-4 py-3 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-sm">{t.name}</div>
                        <div className="text-muted-foreground text-xs uppercase tracking-widest">
                          {t.category_kind === 'suma' || t.category_kind === 'mixto_suma'
                            ? `Suma ≥ ${t.min_sum}`
                            : t.category ?? '—'}{' '}
                          · {new Date(t.starts_at).toLocaleDateString('es-CO')}
                        </div>
                      </div>
                      <Badge variant={t.status === 'open' ? 'success' : 'muted'}>
                        {t.status}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h2 className="font-display mb-3 text-xl tracking-tight">MIEMBROS</h2>
        <Card className="p-2">
          <ul className="divide-border/30 divide-y">
            {members.map((m) => (
              <li key={m.profile_id} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{m.profiles?.display_name}</span>
                <div className="flex items-center gap-2">
                  {m.profiles?.skill_category && (
                    <Badge variant="muted" className="text-[10px]">
                      {m.profiles.skill_category}
                    </Badge>
                  )}
                  <Badge variant={m.role === 'owner' ? 'crown' : 'outline'} className="text-[10px]">
                    {m.role}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
