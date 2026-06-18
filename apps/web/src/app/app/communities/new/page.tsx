import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { createCommunity } from '@/lib/community-actions';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function NewCommunityPage() {
  const supabase = await getSupabaseServerClient();
  const citiesRes = await supabase
    .from('cities')
    .select('slug, name')
    .eq('active', true)
    .order('name');
  const cities = (citiesRes.data ?? []) as unknown as { slug: string; name: string }[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">CREAR COMUNIDAD</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tu comunidad se crea al instante y quedas como owner. Después invitas miembros y
          organizas torneos.
        </p>
      </div>

      <ActionForm action={createCommunity}>
        <FormField label="Nombre" hint="Ej: Bogotá Pádel Circuit">
          <Input name="name" required minLength={3} placeholder="Mi Comunidad" />
        </FormField>

        <FormField label="Ciudad">
          <Select name="city" defaultValue="Bogotá" required>
            {cities.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Descripción (opcional)">
          <Textarea
            name="description"
            placeholder="Qué tipo de torneos organiza, frecuencia, ubicación habitual…"
          />
        </FormField>

        <SubmitButton variant="crown" size="lg" pendingLabel="Creando…">
          Crear comunidad
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
