import { Globe, Lock, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { joinCommunity } from '@/lib/community-actions';

interface CommunityGateProps {
  community: {
    id: string;
    name: string;
    description: string | null;
    city: string;
    rating: number;
    is_public?: boolean | null;
  };
  memberCount: number;
  hasPendingRequest: boolean;
}

/**
 * Pantalla mostrada a usuarios autenticados que NO son miembros:
 * - is_public = true → vista previa + CTA "Unirme" prominente.
 * - is_public = false → solicitud de acceso con preview mínimo.
 * En ambos casos el flow real es `joinCommunity` (crea request pendiente).
 */
export function CommunityGate({ community, memberCount, hasPendingRequest }: CommunityGateProps) {
  const isPublic = community.is_public !== false;

  if (hasPendingRequest) {
    return (
      <EmptyState
        icon={Users}
        title="Solicitud enviada"
        description={`Le pediste a los admins de ${community.name} que te aprueben el ingreso. Cuando lo hagan, vas a ver todo el contenido de la comunidad acá.`}
        bullets={[
          'Te avisamos cuando aprueben.',
          'Podés salir y volver, la solicitud queda activa.',
        ]}
      />
    );
  }

  if (!isPublic) {
    return (
      <EmptyState
        icon={Lock}
        title="Comunidad privada"
        description={`${community.name} es una comunidad privada. Necesitás solicitar acceso para ver el ranking, torneos y miembros.`}
        bullets={[
          `${memberCount} ${memberCount === 1 ? 'miembro activo' : 'miembros activos'}.`,
          `Sede: ${community.city}.`,
          'Tu solicitud queda pendiente hasta que un admin la apruebe.',
        ]}
        primaryAction={
          <ActionForm action={joinCommunity}>
            <input type="hidden" name="community_id" value={community.id} />
            <SubmitButton variant="crown" pendingLabel="Enviando…">
              Solicitar acceso
            </SubmitButton>
          </ActionForm>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-crown/30 from-crown/10 bg-gradient-to-br to-transparent p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <Badge variant="crown" className="mb-3">
              <Globe className="size-3" />
              Comunidad pública
            </Badge>
            <h2 className="font-display text-2xl tracking-tight md:text-3xl">
              Unite a {community.name}
            </h2>
            {community.description && (
              <p className="text-muted-foreground mt-2 text-sm">{community.description}</p>
            )}
            <ul className="text-foreground/85 mt-4 space-y-1.5 text-sm">
              <li>
                <span className="text-crown">·</span> {memberCount}{' '}
                {memberCount === 1 ? 'miembro' : 'miembros'} jugando.
              </li>
              <li>
                <span className="text-crown">·</span> Sede: {community.city}.
              </li>
              <li>
                <span className="text-crown">·</span> Vas a poder inscribirte en torneos y aparecer
                en el ranking.
              </li>
            </ul>
          </div>
          <ActionForm action={joinCommunity}>
            <input type="hidden" name="community_id" value={community.id} />
            <SubmitButton variant="crown" pendingLabel="Enviando…">
              Unirme a la comunidad
            </SubmitButton>
          </ActionForm>
        </div>
      </Card>

      <p className="text-muted-foreground text-center text-[11px] uppercase tracking-widest">
        Pedí acceso para desbloquear ranking, torneos y miembros.
      </p>
    </div>
  );
}
