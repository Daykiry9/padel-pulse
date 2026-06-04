'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Gift } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type ProfileFields = {
  display_name?: string | null;
  phone: string | null;
  skill_category: string | null;
  birthdate: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
};

const FIELD_LABELS: Record<keyof Omit<ProfileFields, 'display_name'>, string> = {
  skill_category: 'categoría',
  phone: 'teléfono',
  birthdate: 'fecha de nacimiento',
  instagram_handle: 'instagram',
  dominant_hand: 'mano dominante',
  favorite_position: 'posición favorita',
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>;

/**
 * Banner en el dashboard que invita a completar el perfil cuando faltan los
 * datos opcionales que recolectaba el viejo onboarding. Se oculta cuando el
 * user llenó al menos UNO de los campos clave (categoría o teléfono). Antes
 * exigía ambos AND → tras guardar parcial el banner seguía apareciendo y
 * Gabriel reportó "no me deja completarlo" porque pensó que no se guardaba.
 *
 * Versión rica: avatar grande del user, progress bar % calculada sobre 6
 * campos, CTA con conteo de campos faltantes, entrada animada (slide-up +
 * fade) con framer-motion. El haptic feedback del CTA lo da el Button crown
 * por defecto (whileTap + haptics.tap()).
 */
export function ProfileCompletionBanner({
  profile,
  userId,
}: {
  profile: ProfileFields | null;
  userId: string;
}) {
  const hasPhone = Boolean(profile?.phone);
  const hasCategory = Boolean(profile?.skill_category);
  if (hasPhone || hasCategory) return null;

  const filled = FIELD_KEYS.filter((key) => Boolean(profile?.[key])).length;
  const total = FIELD_KEYS.length;
  const missing = FIELD_KEYS.filter((key) => !profile?.[key]);
  const missingCount = missing.length;
  const percent = Math.round((filled / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="border-crown/30 from-crown/[0.08] via-crown/[0.04] relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-4 md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        <Avatar
          seed={userId}
          name={profile?.display_name ?? undefined}
          size="2xl"
          className="ring-crown/40 shrink-0 ring-2 ring-offset-2 ring-offset-background"
        />

        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="text-crown size-3.5" />
              <p className="font-display text-crown text-xs tracking-tight uppercase">
                Desbloqueá recompensas
              </p>
            </div>
            <p className="text-foreground text-sm leading-snug font-medium md:text-base">
              {profile?.display_name
                ? `${profile.display_name.split(' ')[0]}, te faltan ${missingCount} ${missingCount === 1 ? 'dato' : 'datos'}`
                : `Te faltan ${missingCount} ${missingCount === 1 ? 'dato' : 'datos'} para completar tu perfil`}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Completá {missing.slice(0, 3).map((k) => FIELD_LABELS[k]).join(', ')}
              {missing.length > 3 ? ` y ${missing.length - 3} más` : ''} para recibir premios en
              torneos.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] tracking-wide uppercase">
              <span className="text-muted-foreground font-display">Perfil</span>
              <span className="text-crown font-display tabular-nums">{percent}%</span>
            </div>
            <div className="bg-crown/10 relative h-1.5 overflow-hidden rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="bg-crown absolute inset-y-0 left-0 rounded-full"
              />
            </div>
          </div>
        </div>

        <Button
          variant="crown"
          size="sm"
          asChild
          className="self-stretch md:self-center md:shrink-0"
        >
          <Link href="/app/profile">
            Completar {missingCount}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
