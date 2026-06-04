import Link from 'next/link';
import { Crown, KeyRound, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { JoinWithCodeModal } from '@/components/join-with-code-modal';

/**
 * Empty state full-screen del HUB cuando el usuario no pertenece a ninguna
 * comunidad. El nuevo Home vive dentro de tu comunidad: sin una, no hay home,
 * solo un onboarding que invita a unirse con código o crear la tuya.
 */
export function NoCommunityEmptyState() {
  return (
    <div className="relative flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="bg-crown/[0.05] pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="border-crown/30 bg-card relative mb-6 flex size-24 items-center justify-center rounded-2xl border shadow-[0_8px_30px_-12px_rgba(255,197,61,0.45)]">
          <Crown className="text-crown size-12" strokeWidth={1.5} />
        </div>

        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Aún no estás en ninguna comunidad
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          PadelKing arranca con tu comunidad. Únete con un código de
          invitación o crea la tuya y arma torneos con tu grupo.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
          <JoinWithCodeModal
            trigger={
              <Button variant="crown" size="lg" className="w-full">
                <KeyRound className="size-4" />
                Unirme con código
              </Button>
            }
          />
          <Button variant="outline" size="lg" asChild className="w-full">
            <Link href="/app/communities/new">
              <Plus className="size-4" />
              Crear mi comunidad
            </Link>
          </Button>
        </div>

        <Link
          href="/app/communities?tab=discover"
          className="text-muted-foreground hover:text-foreground mt-6 text-xs uppercase tracking-widest underline-offset-4 hover:underline"
        >
          Explorar comunidades
        </Link>
      </div>
    </div>
  );
}
