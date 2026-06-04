import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Crown, Trophy, Users, Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSession } from '@/lib/supabase/server';

export default async function HomePage() {
  const user = await getSession();
  if (user) {
    redirect('/app');
  }

  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <SiteHeader />
      <Hero />
      <WhatIsIt />
      <MinimalFooter />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button variant="crown" size="sm" asChild>
            <Link href="/signup">
              Únete
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="court-grid absolute inset-0 opacity-50" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(255,197,61,0.18),transparent_60%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-20 text-center md:pt-28">
        <Badge variant="crown" className="px-3 py-1">
          <Crown className="size-3" />
          Beta privada · Bogotá
        </Badge>

        <h1 className="font-display mt-6 text-balance text-5xl leading-[0.95] tracking-tight md:text-7xl">
          PADELKING — LA LIGA DEL{' '}
          <span className="text-crown">PÁDEL</span>{' '}
          COLOMBIANO.
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-balance text-lg md:text-xl">
          Comunidades, torneos y ranking para el pádel amateur. Crea tu equipo, juega y sube en la
          tabla.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="crown" size="xl" asChild>
            <Link href="/signup">
              Crear cuenta
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function WhatIsIt() {
  const items = [
    {
      icon: Globe,
      title: 'Comunidades',
      desc: 'Únete a la comunidad de tu club o ciudad. Calendario, miembros y categorías en un solo lugar.',
    },
    {
      icon: Trophy,
      title: 'Torneos',
      desc: 'Inscríbete a americanos, ligas o eliminación directa. Bracket auto-generado y marcador en vivo.',
    },
    {
      icon: Users,
      title: 'Ranking',
      desc: 'ELO + puntos por torneo. Ranking interno de tu comunidad y entre comunidades, mes a mes.',
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <Badge>¿Qué es PadelKing?</Badge>
        <h2 className="font-display mt-4 text-3xl tracking-tight md:text-4xl">
          TODO EL PÁDEL AMATEUR.<br />
          <span className="text-crown">EN UNA SOLA APP.</span>
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <div className="bg-crown/10 text-crown mb-3 flex size-10 items-center justify-center rounded-lg">
                <item.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function MinimalFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs md:flex-row">
        <div className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 uppercase tracking-widest">
          <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terms" className="hover:text-foreground">Términos</Link>
          <Link href="mailto:hola@padelking.co" className="hover:text-foreground normal-case tracking-normal">hola@padelking.co</Link>
        </div>
        <div>© {new Date().getFullYear()} PadelKing</div>
      </div>
    </footer>
  );
}
