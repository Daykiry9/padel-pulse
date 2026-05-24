import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, Check, Crown, Globe, Mail, Users, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { decideCommunityCreation } from '@/lib/community-approval-actions';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type RequestRow = {
  id: string;
  proposed_name: string;
  proposed_slug: string;
  proposed_city: string;
  proposed_description: string | null;
  requested_by: string;
  founding_members: { name: string; contact: string | null }[];
  status: string;
  created_at: string;
  requester: { display_name: string; phone: string | null } | null;
};

export default async function AdminPage() {
  const user = await getSession();
  if (!user) redirect('/login?next=/admin');

  const supabase = await getSupabaseServerClient();
  const { data: me } = await supabase
    .from('profiles')
    .select('is_super_admin, display_name')
    .eq('id', user.id)
    .maybeSingle();
  const profile = me as { is_super_admin: boolean; display_name: string } | null;

  if (!profile?.is_super_admin) {
    return (
      <div className="space-y-6">
        <Card className="p-12 text-center">
          <Crown className="text-muted-foreground mx-auto size-10" />
          <p className="font-display mt-3 text-xl">SOLO SUPER ADMINS</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Esta página es solo para el equipo de PadelKing.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/app">Volver al dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Fetch pending community creation requests
  const { data: requestsData } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (k: string, v: string) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{ data: RequestRow[] | null }>;
          };
        };
      };
    }
  )
    .from('community_creation_requests')
    .select(
      'id, proposed_name, proposed_slug, proposed_city, proposed_description, requested_by, founding_members, status, created_at, requester:requested_by(display_name, phone)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  const requests = (requestsData ?? []) as RequestRow[];

  // Stats
  const { data: statsData } = await (
    supabase as unknown as {
      from: (t: string) => { select: (cols: string) => Promise<{ data: { status: string }[] | null }> };
    }
  )
    .from('community_creation_requests')
    .select('status');
  const stats = (statsData ?? []) as { status: string }[];
  const counts = {
    pending: stats.filter((s) => s.status === 'pending').length,
    approved: stats.filter((s) => s.status === 'approved').length,
    rejected: stats.filter((s) => s.status === 'rejected').length,
  };

  return (
    <div className="space-y-8">
      <div>
        <Badge variant="crown">Super Admin</Badge>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          PANEL <span className="text-crown">ADMIN</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Hola {profile.display_name}. Aprueba o rechaza solicitudes de comunidades aquí.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Pendientes" value={counts.pending} accent="text-crown" />
        <Stat label="Aprobadas" value={counts.approved} accent="text-success" />
        <Stat label="Rechazadas" value={counts.rejected} accent="text-muted-foreground" />
      </div>

      {/* Distribución de actividad por ciudad — demo hasta que haya volumen */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg tracking-tight">ACTIVIDAD · COLOMBIA</h2>
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Comunidades por ciudad
          </span>
        </div>
        <div className="mt-4 space-y-2.5">
          {[
            { city: 'Bogotá', demo: 12 },
            { city: 'Medellín', demo: 6 },
            { city: 'Cali', demo: 4 },
            { city: 'Cartagena', demo: 2 },
            { city: 'Bucaramanga', demo: 1 },
          ].map((row) => {
            const pct = Math.max(4, (row.demo / 12) * 100);
            return (
              <div key={row.city} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 text-xs uppercase tracking-widest">
                  {row.city}
                </span>
                <div className="bg-muted/40 relative flex-1 overflow-hidden rounded-full">
                  <div className="bg-crown/60 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                  {row.demo}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-4 text-[10px] uppercase tracking-widest">
          Demo · datos reales cuando arranque la beta abierta
        </p>
      </Card>

      <section>
        <h2 className="font-display mb-4 text-2xl tracking-tight">SOLICITUDES PENDIENTES</h2>

        {requests.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No hay solicitudes pendientes. Limpio.
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <Card key={r.id} className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="crown">{r.proposed_city}</Badge>
                    <h3 className="font-display mt-2 text-xl tracking-tight">
                      {r.proposed_name}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Slug: <code className="font-mono">{r.proposed_slug}</code> · Solicitado{' '}
                      {new Date(r.created_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>

                {r.proposed_description && (
                  <p className="text-foreground/80 border-border/40 border-l-2 pl-3 text-sm">
                    {r.proposed_description}
                  </p>
                )}

                <div>
                  <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
                    <Users className="size-3" />
                    Solicitante
                  </div>
                  <div className="text-sm">
                    {r.requester?.display_name ?? '?'}
                    {r.requester?.phone && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        · {r.requester.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
                    <Globe className="size-3" />
                    Fundadores ({r.founding_members.length})
                  </div>
                  <ul className="divide-border/30 border-border/40 divide-y rounded-md border">
                    {r.founding_members.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="text-muted-foreground tabular-nums text-xs w-6">
                          {i + 1}.
                        </span>
                        <span className="font-medium">{f.name}</span>
                        {f.contact && (
                          <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                            <Mail className="size-3" />
                            {f.contact}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Acciones */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border-success/30 p-4">
                    <ActionForm action={decideCommunityCreation}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <p className="text-foreground/80 mb-2 text-xs">
                        Aprobar crea la comunidad con {r.proposed_name} como owner.
                      </p>
                      <Textarea
                        name="note"
                        placeholder="Nota opcional para el solicitante…"
                        rows={2}
                      />
                      <SubmitButton variant="default" size="sm" className="mt-2 w-full">
                        <Check className="size-3" />
                        Aprobar
                      </SubmitButton>
                    </ActionForm>
                  </Card>

                  <Card className="border-destructive/30 p-4">
                    <ActionForm action={decideCommunityCreation}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <p className="text-foreground/80 mb-2 text-xs">
                        Rechazar envía notif al solicitante con tu razón.
                      </p>
                      <Textarea
                        name="note"
                        placeholder="Razón (recomendado): faltan miembros reales, duplicada, etc."
                        rows={2}
                      />
                      <SubmitButton variant="destructive" size="sm" className="mt-2 w-full">
                        <X className="size-3" />
                        Rechazar
                      </SubmitButton>
                    </ActionForm>
                  </Card>
                </div>

                <div className="text-muted-foreground flex items-center gap-1 text-[10px] uppercase tracking-widest">
                  <Calendar className="size-3" />
                  {new Date(r.created_at).toLocaleDateString('es-CO', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="p-4">
      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</div>
      <div className={`font-display mt-1 text-3xl tabular-nums ${accent}`}>{value}</div>
    </Card>
  );
}
