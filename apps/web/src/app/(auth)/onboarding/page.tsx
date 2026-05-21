import { redirect } from 'next/navigation';

import { ALL_CATEGORIES, KING_CATEGORIES, QUEENS_CATEGORIES } from '@padelking/domain';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Form } from '@/components/forms/form';
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

export default async function OnboardingPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  // Si ya tiene categoría, saltar al dashboard
  if (profile?.skill_category) {
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

      <Form action={updateProfile}>
        {({ isPending }) => (
          <>
            <FormField label="Género">
              <Select name="gender" defaultValue="male" required>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="nonbinary">No-binario</option>
                <option value="prefer_not_to_say">Prefiero no decir</option>
              </Select>
            </FormField>

            <FormField
              label="Tu categoría actual"
              hint="Si no sabes, elige una baja conservadora. El organizador puede ajustarla."
            >
              <Select name="skill_category" defaultValue="quinta" required>
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

            <FormField label="Ciudad">
              <Input name="city" defaultValue="Bogotá" required />
            </FormField>

            <Button type="submit" variant="crown" size="lg" disabled={isPending} className="w-full">
              {isPending ? 'Guardando…' : 'Continuar al dashboard'}
            </Button>
          </>
        )}
      </Form>
    </div>
  );
}

// Suppress unused warning
void ALL_CATEGORIES;
