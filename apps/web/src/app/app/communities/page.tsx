import Link from 'next/link';
import { Globe, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  rating: number;
  member_count?: number;
  recent_members?: { profile_id: string; display_name: string | null }[];
};

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

  const communitiesRaw = (allRes.data ?? []) as unknown as Community[];
  const myIds = new Set((mineRes.data ?? []).map((m) => m.community_id));

  // Fetch member counts + recent members (5 per community)
  let communities: Community[] = communitiesRaw;
  if (communitiesRaw.length > 0) {
    const ids = communitiesRaw.map((c) => c.id);
    const { data: members } = await supabase
      .from('community_members')
      .select('community_id, profile_id, profiles(display_name)')
      .in('community_id', ids)
      .order('joined_at', { ascending: false });
    const grouped = new Map<string, { profile_id: string; display_name: string | null }[]>();
    for (const m of (members ?? []) as {
      community_id: string;
      profile_id: string;
      profiles: { display_name: string | null } | null;
    }[]) {
      if (!grouped.has(m.community_id)) grouped.set(m.community_id, []);
      grouped.get(m.community_id)!.push({
        profile_id: m.profile_id,
        display_name: m.profiles?.display_name ?? null,
      });
    }
    communities = communitiesRaw.map((c) => ({
      ...c,
      member_count: grouped.get(c.id)?.length ?? 0,
      recent_members: grouped.get(c.id)?.slice(0, 5) ?? [],
    }));
  }

  const myCommunities = communities.filter((c) => myIds.has(c.id));
  const others = communities.filter((c) => !myIds.has(c.id));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="crown">Comunidades</Badge>
          <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
            COMUNIDADES
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            Únete a un grupo activo o crea el tuyo (puedes empezar con 1).
          </p>
        </div>
        <Button variant="crown" asChild>
          <Link href="/app/communities/new">
            <Plus className="size-4" />
            Solicitar nueva
          </Link>
        </Button>
      </header>

      {/* Grid uniforme: mis comunidades primero (badge MIEMBRO), después el resto */}
      {communities.length > 0 ? (
        <Section
          title={`Comunidades activas · ${communities.length}`}
          subtitle={
            myCommunities.length > 0
              ? `Eres miembro de ${myCommunities.length} · descubre las demás abajo`
              : 'Encuentra tu parche local y pide unirte'
          }
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...myCommunities, ...others].map((c) => (
              <CommunityCard key={c.id} community={c} isMember={myIds.has(c.id)} />
            ))}
          </div>
        </Section>
      ) : (
        <EmptyState
          icon={Globe}
          title="Aún no hay comunidades"
          description="Sé el primero en armar un parche local. Solo necesitas tu nombre para arrancar; un super admin la revisa en 24-48h."
          bullets={[
            'Una comunidad agrupa jugadores de una ciudad o zona',
            'Organiza torneos americanos y eliminatorias',
            'Tiene su propio ranking interno + exposure ante sponsors',
          ]}
          primaryAction={
            <Button variant="crown" asChild>
              <Link href="/app/communities/new">
                <Plus className="size-4" />
                Solicitar comunidad
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function CommunityCard({ community, isMember }: { community: Community; isMember: boolean }) {
  return (
    <Link href={`/app/communities/${community.slug}`} className="block">
      <Card className="group hover:border-gold-400/40 relative h-full overflow-hidden p-5 transition-[border-color,background-color] duration-[var(--duration-base)]">
        {/* Avatar grande arriba */}
        <div className="flex items-start justify-between gap-3">
          <Avatar seed={community.slug} name={community.name} size="xl" />
          {isMember && <Badge variant="success">Miembro</Badge>}
        </div>

        <h3 className="font-display mt-4 line-clamp-2 text-lg tracking-tight">
          {community.name}
        </h3>

        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <Globe className="size-3" />
            {community.city}
          </span>
          <span className="tabular-nums">Rating {community.rating}</span>
        </div>

        {community.description && (
          <p className="text-foreground/75 mt-3 line-clamp-2 text-sm leading-relaxed">
            {community.description}
          </p>
        )}

        {/* Miembros sociales */}
        <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2.5">
            {community.recent_members && community.recent_members.length > 0 ? (
              <AvatarGroup
                avatars={community.recent_members.map((m) => ({
                  seed: m.profile_id,
                  name: m.display_name ?? undefined,
                }))}
                max={4}
                size="xs"
              />
            ) : (
              <Users className="text-muted-foreground size-3.5" />
            )}
            <span className="text-muted-foreground text-xs tabular-nums">
              {community.member_count ?? 0} miembros
            </span>
          </div>
          <span className="text-muted-foreground group-hover:text-foreground text-[10px] uppercase tracking-widest transition-colors">
            Ver →
          </span>
        </div>
      </Card>
    </Link>
  );
}
