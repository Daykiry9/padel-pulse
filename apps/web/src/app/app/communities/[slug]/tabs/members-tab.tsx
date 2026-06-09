import { Inbox, Users } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { JoinRequestRow } from '../join-request-row';
import { LeaveCommunityButton } from '../leave-community-button';

interface MembersTabProps {
  communityId: string;
  communityName: string;
  isOwner: boolean;
  currentUserId: string;
}

type MemberRow = {
  profile_id: string;
  role: 'owner' | 'admin' | 'member';
  profiles: {
    display_name: string;
    avatar_url: string | null;
    skill_category: string | null;
    city: string | null;
  } | null;
};

type JoinReqRow = {
  id: string;
  profile_id: string;
  message: string | null;
  created_at: string;
  profiles: { display_name: string; skill_category: string | null; city: string | null } | null;
};

const ROLE_ORDER: Record<MemberRow['role'], number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

const ROLE_LABEL: Record<MemberRow['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Miembro',
};

export async function MembersTab({
  communityId,
  communityName,
  isOwner,
  currentUserId,
}: MembersTabProps) {
  const supabase = await getSupabaseServerClient();

  // Members: lectura embedded a profiles. RLS de profiles oculta filas ajenas,
  // asi que para los huecos hidratamos desde profiles_public por id.
  const [membersRes, joinReqsRes] = await Promise.all([
    supabase
      .from('community_members')
      .select('profile_id, role, profiles(display_name, avatar_url, skill_category, city)')
      .eq('community_id', communityId),
    isOwner
      ? (
          supabase as unknown as {
            from: (t: string) => {
              select: (cols: string) => {
                eq: (k: string, v: string) => {
                  eq: (k: string, v: string) => {
                    order: (
                      col: string,
                      opts: { ascending: boolean },
                    ) => Promise<{ data: JoinReqRow[] | null }>;
                  };
                };
              };
            };
          }
        )
          .from('community_join_requests')
          .select(
            'id, profile_id, message, created_at, profiles:profile_id(display_name, skill_category, city)',
          )
          .eq('community_id', communityId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as JoinReqRow[] }),
  ]);

  let members = (membersRes.data ?? []) as MemberRow[];

  // Fallback publico: hidratar perfiles ocultos por RLS desde profiles_public.
  const missingIds = members.filter((m) => !m.profiles).map((m) => m.profile_id);
  if (missingIds.length > 0) {
    const { data: pubData } = await supabase
      .from('profiles_public')
      .select('id, display_name, avatar_url, skill_category, city')
      .in('id', missingIds);
    const byId = new Map(
      ((pubData ?? []) as {
        id: string;
        display_name: string;
        avatar_url: string | null;
        skill_category: string | null;
        city: string | null;
      }[]).map((p) => [p.id, p]),
    );
    members = members.map((m) => {
      if (m.profiles) return m;
      const pub = byId.get(m.profile_id);
      if (!pub) return m;
      return {
        ...m,
        profiles: {
          display_name: pub.display_name,
          avatar_url: pub.avatar_url,
          skill_category: pub.skill_category,
          city: pub.city,
        },
      };
    });
  }

  let pendingRequests = (joinReqsRes.data ?? []) as JoinReqRow[];

  // Las RLS de profiles ocultan al solicitante (aún no es miembro), así que el
  // embed viene null → "?". Hidratamos desde profiles_public por id.
  const missingReqIds = pendingRequests.filter((r) => !r.profiles).map((r) => r.profile_id);
  if (missingReqIds.length > 0) {
    const { data: pubReqData } = await supabase
      .from('profiles_public')
      .select('id, display_name, skill_category, city')
      .in('id', missingReqIds);
    const reqById = new Map(
      ((pubReqData ?? []) as {
        id: string;
        display_name: string;
        skill_category: string | null;
        city: string | null;
      }[]).map((p) => [p.id, p]),
    );
    pendingRequests = pendingRequests.map((r) => {
      if (r.profiles) return r;
      const pub = reqById.get(r.profile_id);
      if (!pub) return r;
      return {
        ...r,
        profiles: {
          display_name: pub.display_name,
          skill_category: pub.skill_category,
          city: pub.city,
        },
      };
    });
  }

  members.sort((a, b) => {
    const ro = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (ro !== 0) return ro;
    return (a.profiles?.display_name ?? '').localeCompare(b.profiles?.display_name ?? '');
  });

  return (
    <section className="space-y-8">
      {isOwner && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl tracking-tight">
              SOLICITUDES DE INGRESO{' '}
              {pendingRequests.length > 0 && (
                <span className="text-crown">({pendingRequests.length})</span>
              )}
            </h2>
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Solo visible para owners
            </span>
          </div>
          {pendingRequests.length === 0 ? (
            <Card className="text-muted-foreground flex items-center gap-3 p-6 text-sm">
              <Inbox className="size-4" />
              No hay solicitudes pendientes. Cuando un jugador pida unirse aparecera aca.
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <JoinRequestRow key={req.id} request={req} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">MIEMBROS</h2>
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
            {members.length} totales
          </span>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin miembros todavia"
            description="Cuando alguien apruebe su solicitud de ingreso aparecera aca."
          />
        ) : (
          <Card className="p-2">
            <ul className="divide-border/30 divide-y">
              {members.map((m) => {
                const isMe = m.profile_id === currentUserId;
                return (
                  <li
                    key={m.profile_id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        seed={m.profile_id}
                        name={m.profiles?.display_name}
                        src={m.profiles?.avatar_url ?? undefined}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm">
                          {m.profiles?.display_name ?? '?'}
                          {isMe && (
                            <span className="text-crown ml-1 text-[9px] uppercase tracking-widest">
                              · tu
                            </span>
                          )}
                        </div>
                        {m.profiles?.city && (
                          <div className="text-muted-foreground truncate text-[10px] uppercase tracking-widest">
                            {m.profiles.city}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.profiles?.skill_category && (
                        <Badge variant="muted" className="text-[9px]">
                          {m.profiles.skill_category}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          m.role === 'owner'
                            ? 'crown'
                            : m.role === 'admin'
                              ? 'data'
                              : 'outline'
                        }
                        className="text-[9px]"
                      >
                        {ROLE_LABEL[m.role]}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <LeaveCommunityButton
        communityId={communityId}
        communityName={communityName}
        isOwner={isOwner}
      />
    </section>
  );
}
