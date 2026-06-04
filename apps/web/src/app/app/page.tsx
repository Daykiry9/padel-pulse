import { ProfileCompletionBanner } from '@/components/profile-completion-banner';
import { CommunityHubHome } from '@/components/community-hub-home';
import { NoCommunityEmptyState } from '@/components/no-community-empty-state';
import { getActiveCommunityId, getUserCommunities } from '@/lib/active-community';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type Profile = {
  display_name: string | null;
  skill_category: string | null;
  phone: string | null;
  birthdate: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
};

/**
 * HUB DE LA COMUNIDAD ACTIVA.
 *
 * El Home ya no es "ranking + KPIs + torneos globales". Es la comunidad del
 * usuario: torneos internos, miembros, ranking de la comunidad y switcher
 * cuando pertenece a varias. Si no esta en ninguna → empty state que invita
 * a unirse o crear una.
 */
export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;
  const supabase = await getSupabaseServerClient();

  const [profileRes, allCommunities] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'display_name, skill_category, phone, birthdate, instagram_handle, dominant_hand, favorite_position',
      )
      .eq('id', user.id)
      .single(),
    getUserCommunities(supabase, user.id),
  ]);

  const profile = profileRes.data as unknown as Profile | null;

  if (allCommunities.length === 0) {
    return (
      <div className="space-y-10">
        <ProfileCompletionBanner profile={profile} />
        <NoCommunityEmptyState />
      </div>
    );
  }

  const activeCommunityId = await getActiveCommunityId(supabase, user.id);
  const activeCommunity =
    allCommunities.find((c) => c.id === activeCommunityId) ?? allCommunities[0]!;

  return (
    <div className="space-y-10">
      <ProfileCompletionBanner profile={profile} />
      <CommunityHubHome
        user={user}
        activeCommunity={activeCommunity}
        allCommunities={allCommunities}
        profile={profile}
      />
    </div>
  );
}
