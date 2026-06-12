import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Check, Settings } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { updateCommunity } from '@/lib/community-actions';
import { CommunityLogoUploader } from '@/components/community-logo-uploader';
import { DeleteCommunitySection } from './delete-community-section';

type DeleteError = 'confirmation' | 'tournaments' | 'not_owner' | 'invalid' | 'server';

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  owner_id: string;
  is_public: boolean | null;
  logo_url: string | null;
};

export default async function CommunitySettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; delete_error?: string }>;
}) {
  const { slug } = await params;
  const { saved, delete_error: deleteErrorRaw } = await searchParams;
  const justSaved = saved === '1';

  const validErrors: DeleteError[] = ['confirmation', 'tournaments', 'not_owner', 'invalid', 'server'];
  const deleteError = validErrors.includes(deleteErrorRaw as DeleteError)
    ? (deleteErrorRaw as DeleteError)
    : null;

  const user = await getSession();
  if (!user) redirect(`/login?next=/app/communities/${slug}/settings`);

  const supabase = await getSupabaseServerClient();
  const { data: communityRaw } = await supabase
    .from('communities')
    .select('id, slug, name, description, city, owner_id, is_public, logo_url')
    .eq('slug', slug)
    .maybeSingle();

  const community = communityRaw as unknown as CommunityRow | null;
  if (!community) notFound();

  if (community.owner_id !== user.id) {
    redirect(`/app/communities/${slug}?tab=ranking`);
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/app/communities/${slug}`}>
            <ArrowLeft className="size-3" />
            Volver a la comunidad
          </Link>
        </Button>
        <Badge variant="crown" className="mb-3">
          <Settings className="size-3" />
          Config de comunidad
        </Badge>
        <h1 className="font-display mt-1 text-3xl tracking-tight md:text-4xl">{community.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Solo vos como owner podés ver y editar esta pantalla.
        </p>
      </div>

      {justSaved && (
        <div
          role="status"
          aria-live="polite"
          className="border-success/30 bg-success/[0.08] flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
        >
          <Check className="text-success size-4 shrink-0" aria-hidden />
          <span>Cambios guardados.</span>
        </div>
      )}

      <Card className="p-6">
        <h2 className="font-display mb-2 text-xl tracking-tight">LOGO DE LA COMUNIDAD</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Aparece en el directorio, en las invitaciones y en las tarjetas compartidas. PNG, JPG, WebP
          o SVG, máximo 2 MB. Cuadrado se ve mejor.
        </p>
        <CommunityLogoUploader
          communityId={community.id}
          currentLogoUrl={community.logo_url}
          communityName={community.name}
        />
      </Card>

      <Card className="p-6">
        <h2 className="font-display mb-4 text-xl tracking-tight">EDITAR DATOS</h2>
        <ActionForm action={updateCommunity}>
          <input type="hidden" name="community_id" value={community.id} />

          <FormField label="Nombre" hint="Mínimo 3 caracteres.">
            <Input name="name" defaultValue={community.name} required minLength={3} />
          </FormField>

          <FormField label="Descripción" hint="Cómo se presenta la comunidad. Opcional.">
            <Textarea
              name="description"
              defaultValue={community.description ?? ''}
              placeholder="Padel los sábados en el norte, nivel intermedio…"
              rows={4}
            />
          </FormField>

          <FormField label="Ciudad">
            <Input name="city" defaultValue={community.city} required placeholder="Bogotá" />
          </FormField>

          <FormField
            label="Privacidad"
            hint="Públicas se listan en el directorio. Privadas solo por invitación."
          >
            <Select name="is_public" defaultValue={community.is_public === false ? 'false' : 'true'}>
              <option value="true">Pública</option>
              <option value="false">Privada</option>
            </Select>
          </FormField>

          <SubmitButton variant="crown" size="lg" pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
        </ActionForm>
      </Card>

      <DeleteCommunitySection
        communityId={community.id}
        slug={community.slug}
        communityName={community.name}
        showError={deleteError}
      />
    </div>
  );
}
