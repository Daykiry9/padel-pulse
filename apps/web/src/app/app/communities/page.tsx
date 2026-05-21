import Link from 'next/link';
import { Globe, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function CommunitiesPage() {
  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const [allRes, mineRes] = await Promise.all([
    supabase
      .from('communities')
      .select('id, slug, name, description, city, rating')
      .order('rating', { ascending: false })
      .limit(50),
    supabase.from('community_members').select('community_id').eq('profile_id', user.id),
  ]);

  const communities = allRes.data ?? [];
  const myIds = new Set((mineRes.data ?? []).map((m) => m.community_id));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            COMUNIDADES
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Únete a un parche existente o crea el tuyo.
          </p>
        </div>
        <Button variant="crown" asChild>
          <Link href="/app/communities/new">
            <Plus className="size-4" />
            Nueva
          </Link>
        </Button>
      </div>

      {communities.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="text-muted-foreground mx-auto size-10" />
          <p className="text-foreground/80 mt-4 font-display text-xl">
            Aún no hay comunidades creadas.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">Crea la primera.</p>
          <Button variant="crown" className="mt-4" asChild>
            <Link href="/app/communities/new">
              <Plus className="size-4" />
              Crear comunidad
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => {
            const isMine = myIds.has(c.id);
            return (
              <Link key={c.id} href={`/app/communities/${c.slug}`}>
                <Card className="group hover:border-crown/40 h-full transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="from-crown/30 to-background size-12 shrink-0 rounded-lg bg-gradient-to-br" />
                      {isMine && <Badge variant="success">Miembro</Badge>}
                    </div>
                    <CardTitle className="mt-3 text-base">{c.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 normal-case">
                      <Globe className="size-3.5" />
                      {c.city}
                    </CardDescription>
                    {c.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm normal-case">
                        {c.description}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                      <Users className="size-3" />
                      Rating {c.rating}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
