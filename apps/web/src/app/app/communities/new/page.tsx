import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Form } from '@/components/forms/form';
import { createCommunity } from '@/lib/community-actions';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function NewCommunityPage() {
  const supabase = await getSupabaseServerClient();
  const { data: cities } = await supabase
    .from('cities')
    .select('slug, name')
    .eq('active', true)
    .order('name');

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">CREAR COMUNIDAD</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Una comunidad agrupa equipos y organiza torneos. Tú serás el owner.
        </p>
      </div>

      <Form action={createCommunity}>
        {({ isPending }) => (
          <>
            <FormField label="Nombre" hint="Ej: Bogotá Pádel Circuit">
              <Input name="name" required minLength={3} placeholder="Mi Comunidad" />
            </FormField>

            <FormField label="Ciudad">
              <Select name="city" defaultValue="Bogotá" required>
                {cities?.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Descripción (opcional)">
              <Textarea name="description" placeholder="Qué tipo de torneos organiza, frecuencia, ubicación habitual…" />
            </FormField>

            <Button type="submit" variant="crown" size="lg" disabled={isPending}>
              {isPending ? 'Creando…' : 'Crear comunidad'}
            </Button>
          </>
        )}
      </Form>
    </div>
  );
}
