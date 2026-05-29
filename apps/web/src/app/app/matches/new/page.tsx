import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import {
  CATEGORY_LABELS,
  FEMENINO_CATEGORIES,
  MASCULINO_CATEGORIES,
  MIXTO_CATEGORIES,
} from '@padelking/domain';

import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { createOpenMatch } from '@/lib/open-match-actions';

export default async function NewMatchPage() {
  const user = await getSession();
  if (!user) redirect('/login?next=/app/matches/new');

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('city, skill_category')
    .eq('id', user.id)
    .maybeSingle();
  const p = profile as { city: string | null; skill_category: string | null } | null;

  // Default datetime: hoy + 3h, redondeado a la hora siguiente
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 3);
  const defaultDateTime = now.toISOString().slice(0, 16);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Badge variant="crown">Nuevo partido</Badge>
        <h1 className="font-display mt-3 text-4xl tracking-tight md:text-5xl">
          ABRIR PARTIDO
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ¿Te faltan 1-3 jugadores? Postealo. Otros en tu ciudad lo ven y se unen. Cuando se llena,
          todos reciben confirmación.
        </p>
      </div>

      <Card className="p-6">
        <ActionForm action={createOpenMatch}>
          <FormField label="Ciudad">
            <Input name="city" defaultValue={p?.city ?? 'Bogotá'} required />
          </FormField>

          <FormField label="Sede (opcional)" hint="Club o dirección. Si está vacío, lo coordinan por chat.">
            <Input name="venue" placeholder="Club Spin Pádel" />
          </FormField>

          <FormField label="Fecha y hora">
            <Input name="scheduled_at" type="datetime-local" defaultValue={defaultDateTime} required />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Duración">
              <Select name="duration_minutes" defaultValue="90">
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </Select>
            </FormField>

            <FormField label="Cupo máximo">
              <Select name="max_players" defaultValue="4">
                <option value="2">2 (1 más)</option>
                <option value="3">3 (2 más)</option>
                <option value="4">4 (cancha llena)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Nivel objetivo (opcional)" hint="Filtra a quién aparece. Vacío = abierto a todos.">
            <Select name="category" defaultValue={p?.skill_category ?? ''}>
              <option value="">Cualquier nivel</option>
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

          <FormField label="Mensaje (opcional)" hint="Ej: 'Llevo pelotas', 'Soy de 4ta vengan tranquilos'">
            <Textarea name="message" rows={3} placeholder="" />
          </FormField>

          <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Publicando…">
            Publicar partido
          </SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
