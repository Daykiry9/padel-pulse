import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
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
  const profile = profileRes.data as {
    skill_category: string | null;
    display_name: string | null;
  } | null;

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

  const defaultDisplayName =
    profile?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split('@')[0] ??
    '';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-4xl">UN PAR DE COSAS RÁPIDAS</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cuéntanos tu nivel y datos para sugerirte torneos correctos y conectar premios cuando
          haya sponsors. Lo puedes ajustar después en tu perfil.
        </p>
      </div>

      <ActionForm action={updateProfile}>
        {invite && <input type="hidden" name="next_invite" value={invite} />}

        {/* Identidad básica */}
        <FormField label="Email">
          <Input type="email" value={user.email ?? ''} readOnly disabled />
        </FormField>

        <FormField label="Nombre completo" hint="Así apareces en torneos y ranking.">
          <Input name="display_name" defaultValue={defaultDisplayName} required minLength={2} />
        </FormField>

        <CategoryQuiz />

        <FormField label="Ciudad">
          <Input name="city" defaultValue="Bogotá" required />
        </FormField>

        {/* Datos del jugador — todos obligatorios */}
        <FormField label="Teléfono" hint="Para premios y notificaciones críticas.">
          <Input name="phone" type="tel" placeholder="+57 300 123 4567" required />
        </FormField>

        <FormField label="Fecha de nacimiento">
          <Input name="birthdate" type="date" required />
        </FormField>

        <FormField label="Instagram" hint="Para tag en stories de torneos. Sin @.">
          <Input name="instagram_handle" placeholder="juanesp_padel" required />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mano dominante">
            <Select name="dominant_hand" defaultValue="" required>
              <option value="" disabled>
                Selecciona…
              </option>
              <option value="right">Derecha</option>
              <option value="left">Zurda</option>
            </Select>
          </FormField>

          <FormField label="Posición preferida">
            <Select name="favorite_position" defaultValue="" required>
              <option value="" disabled>
                Selecciona…
              </option>
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
            required
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

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Guardando…">
          Continuar al dashboard
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
