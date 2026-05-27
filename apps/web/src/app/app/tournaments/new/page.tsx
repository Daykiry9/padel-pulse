import { redirect } from 'next/navigation';

import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { CreateTournamentForm } from './create-tournament-form';

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');

  const { community: communityParam } = await searchParams;
  const supabase = await getSupabaseServerClient();

  // ?community=<id> → la comunidad organiza el torneo directo (sin club).
  // Validamos que el caller sea el owner (la RLS lo exige igual al insertar).
  let community: { id: string; name: string } | null = null;
  if (communityParam) {
    const { data } = await supabase
      .from('communities')
      .select('id, name, owner_id')
      .eq('id', communityParam)
      .maybeSingle();
    const c = data as { id: string; name: string; owner_id: string } | null;
    if (c && c.owner_id === user.id) community = { id: c.id, name: c.name };
  }

  const [clubsRes, communitiesRes] = await Promise.all([
    community
      ? Promise.resolve({ data: [] as { id: string; name: string; city: string }[] })
      : supabase.from('clubs').select('id, name, city').order('name'),
    supabase
      .from('community_members')
      .select('community_id, role, communities(id, name)')
      .eq('profile_id', user.id)
      .in('role', ['owner', 'admin']),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">CREAR TORNEO</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {community
            ? `Torneo de ${community.name}. Selecciona formato y categoría.`
            : 'Selecciona formato y categoría. Los campos cambian según el tipo.'}
        </p>
      </div>

      <CreateTournamentForm
        clubs={clubsRes.data ?? []}
        communities={(communitiesRes.data ?? []).map((c) => c.communities).filter(Boolean) as { id: string; name: string }[]}
        community={community}
      />
    </div>
  );
}
