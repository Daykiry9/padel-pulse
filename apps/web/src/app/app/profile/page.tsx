import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, ExternalLink, Trophy, Users } from 'lucide-react';

import {
  CATEGORY_LABELS,
  FEMENINO_CATEGORIES,
  MASCULINO_CATEGORIES,
  MIXTO_CATEGORIES,
} from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { DeleteAccountSection } from '@/components/delete-account-section';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { updateProfile } from '@/lib/auth-actions';

type Profile = {
  id: string;
  display_name: string;
  gender: string | null;
  skill_category: string | null;
  city: string | null;
  phone: string | null;
  birthdate: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
  playing_since_year: number | null;
  marketing_opt_in: boolean;
  elo_rating: number;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ delete_error?: string }>;
}) {
  const { delete_error: deleteError } = await searchParams;
  const deleteErrorTyped =
    deleteError === 'confirmation' || deleteError === 'server' ? deleteError : null;
  const user = await getSession();
  if (!user) redirect('/login?next=/app/profile');

  const supabase = await getSupabaseServerClient();
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  let profile = profileData as unknown as Profile | null;
  // Self-heal: si la fila no existe (callback OAuth fallido en producción, o
  // race condition de signup), la creamos acá en lugar de redirigir a /app
  // donde el banner mandaría de vuelta — eso era el dead-end del workflow
  // wf_3441189c.
  if (!profile) {
    const admin = getServiceRoleClient();
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      (meta?.full_name as string | undefined) ??
      (meta?.name as string | undefined) ??
      (meta?.display_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Jugador';
    await admin
      .from('profiles')
      .upsert(
        { id: user.id, display_name: displayName } as never,
        { onConflict: 'id', ignoreDuplicates: true },
      );
    const { data: healed } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    profile = healed as unknown as Profile | null;
    if (!profile) {
      // Si el self-heal igual falla (problema más profundo de RLS / DB), mandamos
      // al user a /login con un error explícito en vez de loop a /app.
      redirect('/login?profile_error=1');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Badge variant="crown">Mi perfil</Badge>
        <h1 className="font-display mt-3 text-3xl tracking-tight md:text-4xl">
          {profile.display_name}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {user.email}
          {profile.city ? ` · ${profile.city}` : ''}
        </p>

        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/players/${profile.id}`}>
              <ExternalLink className="size-3" />
              Ver mi perfil público
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats card */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={Trophy} label="Categoría" value={profile.skill_category ? CATEGORY_LABELS[profile.skill_category] ?? profile.skill_category : '—'} />
        <StatCard icon={Crown} label="ELO" value={String(profile.elo_rating ?? 1000)} accent="text-data" />
        <StatCard icon={Users} label="Género" value={profile.gender ?? '—'} />
      </div>

      {/* Edit form */}
      <Card className="p-6">
        <h2 className="font-display mb-4 text-xl tracking-tight">EDITAR DATOS</h2>
        <ActionForm action={updateProfile}>
          <FormField label="Categoría" hint="Opcional: solo dato interno, no limita inscripciones.">
            <Select name="skill_category" defaultValue={profile.skill_category ?? ''}>
              <option value="">Sin categoría</option>
              <optgroup label="Masculino">
                {MASCULINO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mixto">
                {MIXTO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Femenino">
                {FEMENINO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
            </Select>
          </FormField>

          <FormField label="Género">
            <Select name="gender" defaultValue={profile.gender ?? 'male'} required>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </Select>
          </FormField>

          <FormField label="Ciudad">
            <Input name="city" defaultValue={profile.city ?? ''} placeholder="Bogotá" required />
          </FormField>

          <FormField label="Teléfono" hint="Para premios y notificaciones críticas.">
            <Input
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ''}
              placeholder="+57 300 123 4567"
            />
          </FormField>

          <FormField label="Fecha de nacimiento">
            <Input name="birthdate" type="date" defaultValue={profile.birthdate ?? ''} />
          </FormField>

          <FormField label="Instagram" hint="Sin @">
            <Input
              name="instagram_handle"
              defaultValue={profile.instagram_handle ?? ''}
              placeholder="juanesp_padel"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Mano dominante">
              <Select name="dominant_hand" defaultValue={profile.dominant_hand ?? ''}>
                <option value="">—</option>
                <option value="right">Derecha</option>
                <option value="left">Zurda</option>
              </Select>
            </FormField>

            <FormField label="Posición preferida">
              <Select name="favorite_position" defaultValue={profile.favorite_position ?? ''}>
                <option value="">—</option>
                <option value="drive">Drive</option>
                <option value="reves">Revés</option>
                <option value="ambos">Ambos</option>
              </Select>
            </FormField>
          </div>

          <FormField label="¿Desde qué año juegas?">
            <Input
              name="playing_since_year"
              type="number"
              min={1990}
              max={new Date().getFullYear()}
              defaultValue={profile.playing_since_year ?? ''}
            />
          </FormField>

          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              name="marketing_opt_in"
              value="true"
              defaultChecked={profile.marketing_opt_in}
              className="mt-0.5"
            />
            <span className="text-muted-foreground normal-case">
              Acepto recibir info de torneos, promos y sponsors.
            </span>
          </label>

          <SubmitButton variant="crown" size="lg" pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
        </ActionForm>
      </Card>

      <DeleteAccountSection showError={deleteErrorTyped} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'text-foreground',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className={`font-display mt-1 text-2xl tracking-tight ${accent}`}>{value}</div>
    </Card>
  );
}
