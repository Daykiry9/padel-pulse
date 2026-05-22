import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, ExternalLink, Trophy, Users } from 'lucide-react';

import { KING_CATEGORIES, QUEENS_CATEGORIES } from '@padelking/domain';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { updateProfile } from '@/lib/auth-actions';

const CATEGORY_LABELS: Record<string, string> = {
  libre: 'Libre / Pro',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  queens_libre: 'Queens Libre',
  queens_a: 'Queens A',
  queens_b: 'Queens B',
  queens_c: 'Queens C',
  queens_d: 'Queens D',
  queens_e: 'Queens E',
};

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

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect('/login?next=/app/profile');

  const supabase = await getSupabaseServerClient();
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = profileData as unknown as Profile | null;
  if (!profile) redirect('/onboarding');

  return (
    <div className="space-y-8">
      <div>
        <Badge variant="crown">Mi perfil</Badge>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          {profile.display_name.toUpperCase()}
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
          <FormField label="Categoría">
            <Select name="skill_category" defaultValue={profile.skill_category ?? 'quinta'} required>
              <optgroup label="Masculino">
                {KING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Femenino (Queens)">
                {QUEENS_CATEGORIES.map((c) => (
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
              <option value="nonbinary">No-binario</option>
              <option value="prefer_not_to_say">Prefiero no decir</option>
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
