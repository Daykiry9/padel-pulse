import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Sparkles } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Card } from '@/components/ui/card';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { updateProfile } from '@/lib/auth-actions';

import { CategoryQuiz } from './category-quiz';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const profile = profileRes.data as { skill_category: string | null } | null;

  if (!profile) {
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Jugador';
    await supabase.from('profiles').insert({ id: user.id, display_name: displayName } as never);
  } else if (profile.skill_category) {
    // Ya onboardado: si hay invite pendiente, mandarlo a resolverlo
    const cookieStore = await cookies();
    const pendingInvite = invite ?? cookieStore.get('pending_invite')?.value;
    if (pendingInvite) redirect(`/i/${pendingInvite}`);
    redirect('/app');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">UN PAR DE COSAS RÁPIDAS</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cuéntanos tu nivel para sugerirte torneos correctos. Lo puedes ajustar después en tu
          perfil.
        </p>
      </div>

      <ActionForm action={updateProfile}>
        {invite && <input type="hidden" name="next_invite" value={invite} />}

        <CategoryQuiz />

        <FormField label="Ciudad">
          <Input name="city" defaultValue="Bogotá" required />
        </FormField>

        {/* Sección opcional para subir visibilidad ante sponsors */}
        <Card className="border-crown/20 bg-crown/[0.03] mt-6 p-4">
          <div className="text-crown mb-3 flex items-center gap-2 text-xs uppercase tracking-widest">
            <Sparkles className="size-3.5" />
            Opcional · sube tu visibilidad ante marcas
          </div>
          <p className="text-muted-foreground mb-4 text-xs normal-case">
            Mientras más completo tu perfil, más fácil que sponsors te contacten para premios,
            paletas o ropa. Todo opcional, lo puedes cambiar luego.
          </p>

          <div className="space-y-4">
            <FormField label="Teléfono" hint="Para premios y notificaciones críticas.">
              <Input name="phone" type="tel" placeholder="+57 300 123 4567" />
            </FormField>

            <FormField label="Fecha de nacimiento">
              <Input name="birthdate" type="date" />
            </FormField>

            <FormField label="Instagram" hint="Para tag en stories de torneos. Sin @.">
              <Input name="instagram_handle" placeholder="juanesp_padel" />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Mano dominante">
                <Select name="dominant_hand" defaultValue="">
                  <option value="">—</option>
                  <option value="right">Derecha</option>
                  <option value="left">Zurda</option>
                </Select>
              </FormField>

              <FormField label="Posición preferida">
                <Select name="favorite_position" defaultValue="">
                  <option value="">—</option>
                  <option value="drive">Drive</option>
                  <option value="reves">Revés</option>
                  <option value="ambos">Ambos</option>
                </Select>
              </FormField>
            </div>

            <FormField label="¿Desde qué año juegas pádel?">
              <Input
                name="playing_since_year"
                type="number"
                min={1990}
                max={new Date().getFullYear()}
                placeholder={String(new Date().getFullYear())}
              />
            </FormField>

            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                name="marketing_opt_in"
                value="true"
                defaultChecked={false}
                className="mt-0.5"
              />
              <span className="text-muted-foreground normal-case">
                Acepto recibir info ocasional de torneos, promos y sponsors de PadelKing. Lo puedes
                desactivar en cualquier momento.
              </span>
            </label>
          </div>
        </Card>

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Guardando…">
          Continuar al dashboard
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
