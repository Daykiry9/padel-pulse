import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Globe, ImagePlus, Lock, Pencil, Trophy, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShareInviteButton } from '@/components/share-invite-button';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

import { CommunityGate } from './gate';
import { TabsNav, type TabDef } from './tabs-nav';
import { RankingTab } from './tabs/ranking-tab';
import { TournamentsTab } from './tabs/tournaments-tab';
import { MembersTab } from './tabs/members-tab';
import { TeamsTab } from './tabs/teams-tab';

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  rating: number;
  owner_id: string;
  logo_url: string | null;
  is_public?: boolean | null;
};

export default async function CommunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; sub?: string }>;
}) {
  const { slug } = await params;
  const { tab, sub } = await searchParams;

  const user = await getSession();
  if (!user) return null;

  const supabase = await getSupabaseServerClient();
  const { data: communityRaw } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!communityRaw) notFound();
  const community = communityRaw as unknown as Community;

  const [memberCountRes, mineRes, myPendingRes, tournamentsCountRes] = await Promise.all([
    supabase
      .from('community_members')
      .select('profile_id', { count: 'exact', head: true })
      .eq('community_id', community.id),
    supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', community.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (k: string, v: string) => {
              eq: (k: string, v: string) => {
                eq: (k: string, v: string) => {
                  maybeSingle: () => Promise<{ data: { id: string } | null }>;
                };
              };
            };
          };
        };
      }
    )
      .from('community_join_requests')
      .select('id')
      .eq('community_id', community.id)
      .eq('profile_id', user.id)
      .eq('status', 'pending')
      .maybeSingle(),
    supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', community.id)
      .in('status', ['open', 'in_progress']),
  ]);

  const memberCount = memberCountRes.count ?? 0;
  const activeTournamentsCount = tournamentsCountRes.count ?? 0;
  const isMember = !!mineRes.data;
  const hasPendingRequest = !!myPendingRes.data;
  const isOwner = community.owner_id === user.id;
  const isPublic = community.is_public !== false;

  const tabs: TabDef[] = [
    { key: 'ranking', label: 'Ranking' },
    { key: 'tournaments', label: 'Torneos' },
    { key: 'members', label: 'Miembros' },
    { key: 'teams', label: 'Equipos' },
    ...(isOwner ? [{ key: 'settings' as const, label: 'Config' }] : []),
  ];

  const activeTab = tabs.find((t) => t.key === tab)?.key ?? 'ranking';
  const basePath = `/app/communities/${community.slug}`;

  return (
    <div className="space-y-6">
      <Header
        community={community}
        memberCount={memberCount}
        activeTournamentsCount={activeTournamentsCount}
        isOwner={isOwner}
        isMember={isMember}
        isPublic={isPublic}
      />

      {isOwner && !community.logo_url && (
        <Link
          href={`/app/communities/${community.slug}/settings?tab=logo`}
          className="border-crown/30 bg-crown/[0.04] hover:bg-crown/[0.08] flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
        >
          <ImagePlus className="text-crown size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Sube un logo para tu comunidad</div>
            <div className="text-muted-foreground text-xs">
              Dale identidad — aparece en torneos, rankings y compartidos.
            </div>
          </div>
          <span className="text-crown text-xs uppercase tracking-widest shrink-0">Subir</span>
        </Link>
      )}

      {isMember ? (
        <>
          <TabsNav tabs={tabs} basePath={basePath} />

          <div className="pt-2">
            {activeTab === 'ranking' && (
              <RankingTab
                communityId={community.id}
                communitySlug={community.slug}
                isMember={isMember}
                currentUserId={user.id}
              />
            )}
            {activeTab === 'tournaments' && (
              <TournamentsTab communityId={community.id} isOwner={isOwner} />
            )}
            {activeTab === 'members' && (
              <MembersTab
                communityId={community.id}
                communityName={community.name}
                isOwner={isOwner}
                currentUserId={user.id}
              />
            )}
            {activeTab === 'teams' && (
              <TeamsTab
                communityId={community.id}
                communitySlug={community.slug}
                isMember={isMember}
                isOwner={isOwner}
                currentUserId={user.id}
                sub={sub}
              />
            )}
            {activeTab === 'settings' && isOwner && (
              <SettingsTabPlaceholder slug={community.slug} />
            )}
          </div>
        </>
      ) : (
        <CommunityGate
          community={community}
          memberCount={memberCount}
          hasPendingRequest={hasPendingRequest}
        />
      )}
    </div>
  );
}

function Header({
  community,
  memberCount,
  activeTournamentsCount,
  isOwner,
  isMember,
  isPublic,
}: {
  community: Community;
  memberCount: number;
  activeTournamentsCount: number;
  isOwner: boolean;
  isMember: boolean;
  isPublic: boolean;
}) {
  return (
    <header className="border-border/40 from-card to-background relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          {/* Avatar / Cover */}
          <div className="border-crown/30 bg-crown/10 flex size-16 shrink-0 items-center justify-center rounded-xl border md:size-20">
            {community.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={community.logo_url}
                alt={community.name}
                className="size-full rounded-xl object-cover"
              />
            ) : (
              <span className="font-display text-crown text-2xl md:text-3xl">
                {community.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="crown">
                <Globe className="size-3" />
                {community.city}
              </Badge>
              {!isPublic && (
                <Badge variant="muted">
                  <Lock className="size-3" />
                  Privada
                </Badge>
              )}
              {isMember && <Badge variant="success">Eres miembro</Badge>}
            </div>
            <h1 className="font-display text-3xl tracking-tight md:text-4xl">
              {community.name}
            </h1>
            {community.description && (
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                {community.description}
              </p>
            )}
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {memberCount} miembros
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Trophy className="size-3" />
                {activeTournamentsCount} {activeTournamentsCount === 1 ? 'torneo activo' : 'torneos activos'}
              </span>
              <span>·</span>
              <span>Rating {community.rating}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <ShareInviteButton
            kind="community"
            targetId={community.id}
            name={community.name}
            label="Compartir"
          />
          {isOwner && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/app/communities/${community.slug}/settings`}>
                <Pencil className="size-3" />
                Editar comunidad
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function SettingsTabPlaceholder({ slug }: { slug: string }) {
  return (
    <div className="border-border/40 bg-card/40 rounded-xl border p-8 text-center">
      <Pencil className="text-muted-foreground mx-auto mb-3 size-6" />
      <h3 className="font-display text-xl tracking-tight">Configuración</h3>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
        Próximamente vas a poder editar nombre, descripción, ciudad, visibilidad e invitar nuevos
        admins desde acá.
      </p>
      <div className="mt-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/communities/${slug}/settings`}>
            <Pencil className="size-3" />
            Ir a configuración
          </Link>
        </Button>
      </div>
    </div>
  );
}
