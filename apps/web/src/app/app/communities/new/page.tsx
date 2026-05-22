import { AlertTriangle, Sparkles } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Card } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { requestCommunityCreation } from '@/lib/community-approval-actions';
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
          Crear una comunidad es <strong>por solicitud</strong>. Necesitas listar al menos{' '}
          <strong>5 jugadores fundadores</strong> y un super admin de PadelKing revisará tu pedido.
        </p>
      </div>

      <Card className="border-crown/30 bg-crown/[0.04] flex items-start gap-3 p-4">
        <AlertTriangle className="text-crown size-4 mt-0.5 shrink-0" />
        <div className="text-foreground/80 text-xs">
          Solicitamos los nombres reales de tus 5+ fundadores para evitar comunidades fantasma y
          asegurar que tienes un grupo real listo a jugar. La aprobación toma 24-48h.
        </div>
      </Card>

      <ActionForm action={requestCommunityCreation}>
        <FormField label="Nombre" hint="Ej: Bogotá Pádel Circuit">
          <Input name="name" required minLength={4} placeholder="Mi Comunidad" />
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

        <div className="border-border/40 mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-crown">
            <Sparkles className="size-3.5" />
            Jugadores fundadores (mín 5)
          </div>
          <p className="text-muted-foreground text-xs normal-case">
            Lista los 5+ jugadores con los que vas a empezar. Formato:{' '}
            <span className="text-foreground font-mono">Nombre completo - email/celular</span>.
          </p>

          {Array.from({ length: 8 }).map((_, i) => (
            <FormField
              key={i}
              label={i < 5 ? `Fundador ${i + 1} (requerido)` : `Fundador ${i + 1} (opcional)`}
            >
              <Input
                name={`founding_member_${i}`}
                placeholder={
                  i === 0
                    ? 'Ej: Juan Vergara - juan@ejemplo.com'
                    : i === 1
                      ? 'Ej: Andrés Mejía - +57 300 123 4567'
                      : 'Nombre - contacto'
                }
                required={i < 5}
              />
            </FormField>
          ))}
        </div>

        <SubmitButton variant="crown" size="lg" pendingLabel="Enviando solicitud…">
          Enviar solicitud
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
