import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSession } from '@/lib/supabase/server';
import { redeemInvitation } from '@/lib/invitation-actions';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSession();

  // No autenticado → redirect a signup con el code en query param.
  // (Antes seteábamos una cookie httpOnly como backup, pero en Next 15
  //  cookies().set() desde un Server Component tira excepción server-side.
  //  El code en query param es suficiente para preservar el invite a través
  //  de signup → onboarding → redeem.)
  if (!user) {
    redirect(`/signup?invite=${code}`);
  }

  // Autenticado → resolver el invite y redirigir
  const result = await redeemInvitation(code);
  if (result.redirectTo) {
    redirect(result.redirectTo);
  }

  // Caso de error: mostrar pantalla
  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-6">
        <Card className="w-full p-8 text-center">
          <h1 className="font-display text-3xl tracking-tight">INVITACIÓN INVÁLIDA</h1>
          <p className="text-muted-foreground mt-4 text-sm">
            {result.error ?? 'Link inválido o expirado.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">Inicio</Link>
            </Button>
            <Button variant="crown" asChild>
              <Link href="/app">Ir a mi panel</Link>
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
