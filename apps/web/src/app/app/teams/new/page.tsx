import { redirect } from 'next/navigation';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { createTeam } from '@/lib/team-actions';

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');

  const { community: communityParam } = await searchParams;

  // Sin ?community=<id>: el user elige a qué comunidad sumar el equipo.
  if (!communityParam) redirect('/app/communities');

  const supabase = await getSupabaseServerClient();

  // Validar membresía en la comunidad antes de mostrar el form.
  const membershipRes = await supabase
    .from('community_members')
    .select('community_id, communities(name)')
    .eq('profile_id', user.id)
    .eq('community_id', communityParam)
    .maybeSingle();

  type CommunityMembership = { community_id: string; communities: { name: string } | null };
  const membership = membershipRes.data as unknown as CommunityMembership | null;
  if (!membership || !membership.communities) redirect('/app/communities');

  const communityName = membership.communities.name;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">CREAR EQUIPO</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Equipo en <span className="text-foreground">{communityName}</span>. Son 2 jugadores fijos;
          la categoría y la Suma se calculan automáticamente.
        </p>
      </div>

      <ActionForm action={createTeam}>
        <input type="hidden" name="community_id" value={membership.community_id} />

        <FormField label="Nombre del equipo" hint="Ej: Mejía / Rodríguez">
          <Input name="name" required minLength={3} placeholder="Mi Equipo" />
        </FormField>

        <FormField
          label="Compañero"
          hint="Nombre exacto con el que tu compañero se registró en PadelKing"
        >
          <Input name="partner_email" required placeholder="Nombre del compañero" />
        </FormField>

        <SubmitButton variant="crown" size="lg" pendingLabel="Creando…">
          Crear equipo
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
