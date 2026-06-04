import { redirect } from 'next/navigation';

import { getActiveCommunityId } from '@/lib/active-community';
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

  // 1. Comunidades donde el user es owner/admin (puede organizar torneos)
  const { data: membershipsRaw } = await supabase
    .from('community_members')
    .select('role, communities(id, name)')
    .eq('profile_id', user.id)
    .in('role', ['owner', 'admin']);

  type MembershipRow = {
    role: 'owner' | 'admin';
    communities: { id: string; name: string } | { id: string; name: string }[] | null;
  };
  const memberships = (membershipsRaw ?? []) as unknown as MembershipRow[];
  const organizerCommunities: { id: string; name: string }[] = [];
  for (const m of memberships) {
    const c = Array.isArray(m.communities) ? m.communities[0] : m.communities;
    if (c) organizerCommunities.push({ id: c.id, name: c.name });
  }

  // 2. Comunidad activa: si el user es owner/admin de la activa, la usamos
  //    como default. Si no, defaulteamos a la primera donde sí lo sea.
  const activeId = await getActiveCommunityId(supabase, user.id);
  const activeIsOrganizer = Boolean(
    activeId && organizerCommunities.some((c) => c.id === activeId),
  );
  const defaultCommunityId = activeIsOrganizer
    ? activeId!
    : organizerCommunities[0]?.id ?? null;

  // 3. ?community=<id> override (link directo desde /app/communities/[slug])
  let forcedCommunityId: string | null = null;
  if (communityParam && organizerCommunities.some((c) => c.id === communityParam)) {
    forcedCommunityId = communityParam;
  }

  // 4. Clubs del user (es club_owner si tiene al menos uno)
  const { data: clubsRaw } = await supabase
    .from('clubs')
    .select('id, name, city_id, city')
    .eq('owner_id', user.id)
    .order('name');
  type ClubRow = { id: string; name: string; city_id: string | null; city: string | null };
  const myClubs = (clubsRaw ?? []) as ClubRow[];

  // 5. Cities para el selector de scope='club_open' (si no podemos
  //    auto-detectar desde el club)
  const { data: citiesRaw } = await supabase
    .from('cities')
    .select('id, name')
    .eq('active', true)
    .order('name');
  const cities = (citiesRaw ?? []) as { id: string; name: string }[];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">CREAR TORNEO</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Elegí el alcance del torneo. Cambia quién puede inscribirse y quién lo administra.
        </p>
      </div>

      <CreateTournamentForm
        organizerCommunities={organizerCommunities}
        myClubs={myClubs}
        cities={cities}
        defaultCommunityId={forcedCommunityId ?? defaultCommunityId}
        forcedCommunityId={forcedCommunityId}
      />
    </div>
  );
}
