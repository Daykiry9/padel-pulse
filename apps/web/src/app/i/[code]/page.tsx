import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSession } from '@/lib/supabase/server';
import { redeemInvitation } from '@/lib/invitation-actions';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSession();

  // No autenticado → cookie del invite + redirect a signup
  if (!user) {
    const cookieStore = await cookies();
    cookieStore.set('pending_invite', code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });
    redirect(`/signup?invite=${code}`);
  }

  // Autenticado → resolver el invite y redirigir
  const result = await redeemInvitation(code);
  if (result.ok && result.redirectTo) {
    // Limpiar la cookie si quedó
    const cookieStore = await cookies();
    cookieStore.delete('pending_invite');
    redirect(result.redirectTo);
  }

  // Si el redeem requiere onboarding, también limpiamos pero NO seteamos cookie de invite
  // (el invite se pasa en query param)
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
