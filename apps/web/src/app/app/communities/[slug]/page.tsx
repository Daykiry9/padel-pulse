import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Crown, Globe, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { ShareInviteButton } from '@/components/share-invite-button';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { joinCommunity } from '@/lib/community-actions';
import { getCommunityPlayerRanking } from '@/lib/community-ranking';
import { JoinRequestRow } from './join-request-row';

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

  type JoinReq = {
    id: string;
    profile_id: string;
    message: string | null;
    created_at: string;
    profiles: { display_name: string; skill_category: string | null; city: string | null } | null;
  };
  const [membersRes, teamsRes, tournamentsRes, mineRes, myPendingRes, joinReqsRes] = await Promise.all([
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
      .eq('community_id', community.id)
      .order('starts_at', { ascending: false })
      .limit(10),
    supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', community.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    // ¿Tengo una request pendiente?
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
    // Requests pendientes (solo si soy owner)
    (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (k: string, v: string) => {
              eq: (k: string, v: string) => {
                order: (col: string, opts: { ascending: boolean }) => Promise<{ data: JoinReq[] | null }>;
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
      .eq('community_id', community.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  const members = membersRes.data ?? [];
  const teams = teamsRes.data ?? [];
  const tournaments = tournamentsRes.data ?? [];
  const isMember = !!mineRes.data;
  const hasPendingRequest = !!myPendingRes.data;
  const pendingRequests = (joinReqsRes.data ?? []) as JoinReq[];
  const isOwner = community.owner_id === user.id;
  const communityRanking = await getCommunityPlayerRanking(supabase, community.id);

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <Badge variant="crown" className="mb-3">
            <Globe className="size-3" />
            {community.city}
          </Badge>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            {community.name}
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
        <div className="flex flex-col items-end gap-2">
          {!isMember && !hasPendingRequest && (
            <ActionForm action={joinCommunity}>
              <input type="hidden" name="community_id" value={community.id} />
              <SubmitButton variant="crown" pendingLabel="Enviando…">
                Pedir unirme
              </SubmitButton>
            </ActionForm>
          )}
          {hasPendingRequest && <Badge variant="muted">Solicitud pendiente</Badge>}
          {isMember && <Badge variant="success">Eres miembro</Badge>}
          {isOwner && (
            <ShareInviteButton
              kind="community"
              targetId={community.id}
              name={community.name}
              label="Invitar por WhatsApp"
            />
          )}
        </div>
      </header>

      {/* Solicitudes pendientes (solo visible al owner) */}
      {isOwner && pendingRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">
            SOLICITUDES PENDIENTES{' '}
            <span className="text-crown">({pendingRequests.length})</span>
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <JoinRequestRow key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

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
            <h2 className="font-display text-xl tracking-tight">TORNEOS DE COMUNIDAD</h2>
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/tournaments/new?community=${community.id}`}>
                  <Plus className="size-3" />
                  Nuevo
                </Link>
              </Button>
            )}
          </div>
          {tournaments.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {isOwner
                ? 'Aún no creaste torneos en esta comunidad. Tocá "Nuevo" para armar el primero.'
                : 'No hay torneos en esta comunidad todavía.'}
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

      {communityRanking.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl tracking-tight">RANKING DE LA COMUNIDAD</h2>
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
              T · PJ · ELO
            </span>
          </div>
          <Card className="divide-border/30 divide-y overflow-hidden p-0">
            {communityRanking.map((r, idx) => (
              <div
                key={r.playerId}
                className={`grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-sm ${
                  idx === 0 ? 'bg-crown/[0.04]' : ''
                }`}
              >
                <span
                  className={`font-display text-base tabular-nums ${
                    idx === 0 ? 'text-crown' : 'text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="truncate">
                  {idx === 0 && <Crown className="text-crown mr-1 inline size-3" />}
                  {r.name}
                </span>
                <span className="text-muted-foreground tabular-nums text-xs">{r.tournaments}</span>
                <span className="text-muted-foreground tabular-nums text-xs">{r.matches}</span>
                <span className="font-display tabular-nums">{r.elo}</span>
              </div>
            ))}
          </Card>
          <p className="text-muted-foreground mt-2 text-[10px] uppercase tracking-widest">
            ELO interno de la comunidad · T = torneos jugados · PJ = partidos jugados
          </p>
        </section>
      )}

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
