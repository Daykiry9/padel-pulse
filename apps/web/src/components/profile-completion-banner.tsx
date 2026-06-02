import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ProfileFields = {
  phone: string | null;
  skill_category: string | null;
  birthdate: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
};

/**
 * Banner en el dashboard que invita a completar el perfil cuando faltan los
 * datos opcionales que recolectaba el viejo onboarding. Se oculta cuando el
 * user llenó al menos UNO de los campos clave (categoría o teléfono). Antes
 * exigía ambos AND → tras guardar parcial el banner seguía apareciendo y
 * Gabriel reportó "no me deja completarlo" porque pensó que no se guardaba.
 */
export function ProfileCompletionBanner({ profile }: { profile: ProfileFields | null }) {
  const hasPhone = Boolean(profile?.phone);
  const hasCategory = Boolean(profile?.skill_category);
  if (hasPhone || hasCategory) return null;

  const missing: string[] = [];
  if (!hasCategory) missing.push('categoría');
  if (!hasPhone) missing.push('teléfono');
  if (!profile?.birthdate) missing.push('fecha de nacimiento');
  if (!profile?.instagram_handle) missing.push('instagram');

  return (
    <div className="border-crown/30 bg-crown/[0.06] flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between md:p-5">
      <div className="flex items-start gap-3">
        <div className="bg-crown/15 text-crown rounded-full p-2">
          <Sparkles className="size-4" />
        </div>
        <div className="space-y-1">
          <p className="font-display text-sm tracking-tight uppercase">Completa tu perfil</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Llena tus datos para recibir <span className="text-foreground">recompensas</span> y
            premios cuando juegues torneos.{' '}
            {missing.length > 0 && (
              <span className="text-muted-foreground">Falta: {missing.join(', ')}.</span>
            )}
          </p>
        </div>
      </div>
      <Button variant="crown" size="sm" asChild className="self-stretch md:self-auto">
        <Link href="/app/profile">Completar perfil</Link>
      </Button>
    </div>
  );
}
