import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Plus, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareInviteButton } from '@/components/share-invite-button';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function TeamsPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const { data: members } = await supabase
    .from('team_members')
    .select('team_id, teams(*, communities(name, slug))')
    .eq('profile_id', user.id)
    .eq('is_active', true);

  const teams = (members ?? []).map((m) => m.teams).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">MIS EQUIPOS</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Un jugador suele tener 1 equipo activo. El histórico de equipos pasados se preserva.
          </p>
        </div>
        <Button variant="crown" asChild>
          <Link href="/app/teams/new">
            <Plus className="size-4" />
            Nuevo equipo
          </Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="text-muted-foreground mx-auto size-10" />
          <p className="text-foreground/80 font-display mt-4 text-xl">
            Aún no tienes equipo activo.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Crea uno para inscribirte a torneos Tier 1.
          </p>
          <Button variant="crown" className="mt-4" asChild>
            <Link href="/app/teams/new">
              <Plus className="size-4" />
              Crear equipo
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <Card key={t.id} className="group hover:border-crown/40 h-full transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Crown className="text-crown size-5" />
                  <Badge variant="outline">{t.category ?? 'Mixto'}</Badge>
                </div>
                <CardTitle className="mt-3 text-base">{t.name}</CardTitle>
                <CardDescription className="normal-case">
                  Comunidad: {t.communities?.name}
                  <br />
                  Rating: {t.rating}
                </CardDescription>
                <div className="mt-3">
                  <ShareInviteButton
                    kind="team"
                    targetId={t.id}
                    name={t.name}
                    label="Invitar compañero"
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
