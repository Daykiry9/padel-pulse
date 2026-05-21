import { redirect } from 'next/navigation';

import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { CreateTournamentForm } from './create-tournament-form';

export default async function NewTournamentPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const [clubsRes, communitiesRes] = await Promise.all([
    supabase.from('clubs').select('id, name, city').order('name'),
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
          Selecciona formato y categoría. Los campos cambian según el tipo.
        </p>
      </div>

      <CreateTournamentForm
        clubs={clubsRes.data ?? []}
        communities={(communitiesRes.data ?? []).map((c) => c.communities).filter(Boolean) as { id: string; name: string }[]}
      />
    </div>
  );
}
