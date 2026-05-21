import { redirect } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Card } from '@/components/ui/card';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { createTeam } from '@/lib/team-actions';

export default async function NewTeamPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const communitiesRes = await supabase
    .from('community_members')
    .select('community_id, communities(name)')
    .eq('profile_id', user.id);

  type CommunityMembership = { community_id: string; communities: { name: string } | null };
  const rows = (communitiesRes.data ?? []) as unknown as CommunityMembership[];
  const myCommunities = rows.filter((c) => c.communities);

  if (myCommunities.length === 0) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="font-display text-4xl tracking-tight">CREAR EQUIPO</h1>
        <Card className="p-6">
          <p className="text-foreground/80">
            Primero necesitas unirte a una comunidad. Tu equipo va a pertenecer a ella.
          </p>
          <Button variant="crown" className="mt-4" asChild>
            <Link href="/app/communities">Ver comunidades</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">CREAR EQUIPO</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Un equipo son 2 jugadores fijos. La categoría y la Suma se calculan automáticamente.
        </p>
      </div>

      <ActionForm action={createTeam}>
        <FormField label="Nombre del equipo" hint="Ej: Mejía / Rodríguez">
          <Input name="name" required minLength={3} placeholder="Mi Equipo" />
        </FormField>

        <FormField label="Comunidad principal">
          <Select name="community_id" required>
            {myCommunities.map((c) => (
              <option key={c.community_id} value={c.community_id}>
                {c.communities!.name}
              </option>
            ))}
          </Select>
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
