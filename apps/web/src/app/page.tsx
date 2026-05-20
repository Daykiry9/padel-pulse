import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Crown,
  Flame,
  Github,
  Globe,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunityRankingPreview } from '@/components/marketing/community-ranking-preview';
import { TournamentCardPreview } from '@/components/marketing/tournament-card-preview';
import { LiveScoreboardPreview } from '@/components/marketing/live-scoreboard-preview';

const featuredCommunities = [
  { name: 'La Pala', city: 'Bogotá', members: 28, badge: '🏆 #1 BOG' },
  { name: 'Spimpad', city: 'Bogotá', members: 41, badge: 'Club' },
  { name: 'Valkiria', city: 'Bogotá', members: 18, badge: '👑 Femenino' },
  { name: 'El Parche', city: 'Medellín', members: 14, badge: 'Crew' },
];

export default function HomePage() {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <SiteHeader />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Showcase />
      <Rankings />
      <Communities communities={featuredCommunities} />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <PulseLogo />
          <span className="font-display text-lg font-semibold tracking-tight">
            Padel <span className="text-pulse">Pulse</span>
          </span>
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-7 text-sm md:flex">
          <Link href="#como-funciona" className="hover:text-foreground transition-colors">
            Cómo funciona
          </Link>
          <Link href="#torneos" className="hover:text-foreground transition-colors">
            Torneos
          </Link>
          <Link href="#ranking" className="hover:text-foreground transition-colors">
            Ranking
          </Link>
          <Link href="#comunidades" className="hover:text-foreground transition-colors">
            Comunidades
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button variant="pulse" size="sm" asChild>
            <Link href="/signup">
              Crea tu parche
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
      <div className="court-grid absolute inset-0 opacity-40" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--court)_30%,transparent),transparent_60%)]"
        aria-hidden
      />
      <div
        className="absolute -right-32 top-24 -z-10 h-[480px] w-[480px] rounded-full bg-pulse/20 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-8">
            <Badge variant="pulse" className="px-3 py-1 text-xs">
              <Flame className="size-3.5" />
              Beta privada · Bogotá · Mayo 2026
            </Badge>

            <h1 className="font-display text-balance text-5xl font-bold tracking-tight md:text-7xl">
              El <span className="text-court">pulso</span> del{' '}
              <span className="text-pulse">pádel</span> colombiano.
            </h1>

            <p className="text-muted-foreground max-w-xl text-balance text-lg md:text-xl">
              Crea tu parche, inscríbelo a torneos americanos en tu club favorito y compite por el{' '}
              <strong className="text-foreground">ranking nacional de comunidades</strong>. Mes a
              mes, trimestre a trimestre, todo el año.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="pulse" size="xl" asChild>
                <Link href="/signup">
                  Crea tu comunidad
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/tournaments">
                  Ver torneos abiertos
                </Link>
              </Button>
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-smash animate-pulse" /> 3 clubes en beta
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                12 comunidades fundadoras
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="size-4" />
                Torneo de lanzamiento: Jun 2026
              </span>
            </div>
          </div>

          <LiveScoreboardPreview />
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    'La Pala',
    'Spimpad',
    'Valkiria',
    'El Parche',
    'Globo Crew',
    'Smashers',
    'Volea Bogotá',
    'Padelmania',
    'Club Tejar',
  ];
  return (
    <section className="border-y border-border/40 bg-muted/30 py-6 overflow-hidden">
      <div className="text-muted-foreground mx-auto mb-3 max-w-6xl px-6 text-center text-xs uppercase tracking-[0.2em]">
        Comunidades y clubes ya jugando en Padel Pulse
      </div>
      <div className="relative flex overflow-hidden">
        <div className="flex animate-[scroll_30s_linear_infinite] gap-12 px-6 whitespace-nowrap [&>*]:shrink-0">
          {[...items, ...items, ...items].map((item, i) => (
            <span
              key={i}
              className="font-display text-muted-foreground/70 text-2xl md:text-3xl"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: '1. Arma tu parche',
      desc: 'Invita a tus amigos o usa el escudo de tu club. Sin límite de miembros. Tu comunidad es tu identidad.',
    },
    {
      icon: Calendar,
      title: '2. Inscribete a torneos americanos',
      desc: 'Los clubes publican torneos. Tu comunidad inscribe sus parejas y reservas tu cupo en segundos.',
    },
    {
      icon: Zap,
      title: '3. Juega y suma puntos',
      desc: 'Cada partido suma ELO a tu comunidad. Ranking en vivo, marcador en pantalla del club, stories auto-generadas.',
    },
    {
      icon: Crown,
      title: '4. Pelea por la corona',
      desc: 'Top mensual, trimestral, semestral y anual. Premios reales con marcas sponsor. Bragging rights ilimitados.',
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <Badge variant="default">Cómo funciona</Badge>
        <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          De parche a campeón nacional en 4 pasos.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Padel Pulse convierte tu grupo de WhatsApp en una comunidad competitiva con ranking,
          torneos y premios. Sin spreadsheets, sin grupos confundidos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card key={step.title} className="hover:border-court/50 transition-all hover:-translate-y-1">
            <CardHeader>
              <div className="bg-court/10 text-court mb-3 flex size-10 items-center justify-center rounded-lg">
                <step.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{step.title}</CardTitle>
              <CardDescription>{step.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  return (
    <section id="torneos" className="bg-muted/40 border-y border-border/40 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <Badge variant="pulse">Torneos americanos</Badge>
          <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            El formato más social del pádel, ahora con tecnología.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Los torneos americanos rotan parejas cada ronda — todos juegan con todos y contra todos.
            Padel Pulse genera el bracket automáticamente, te avisa tu próxima pista y publica el
            resultado en vivo en una pantalla del club.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Genera rondas automáticamente desde 8 hasta 32 jugadores',
              'Marcador con confirmación cruzada (sin trampas, sin disputas)',
              'Modo espectador en vivo proyectable en pantalla del club',
              'Banner sponsor configurable por torneo',
              'Stories de podio auto-generadas para Instagram',
            ].map((feat) => (
              <li key={feat} className="text-foreground/90 flex items-start gap-3">
                <Sparkles className="text-pulse mt-1 size-4 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <TournamentCardPreview />
      </div>
    </section>
  );
}

function Rankings() {
  return (
    <section id="ranking" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <div>
          <Badge variant="smash">Ranking</Badge>
          <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Tu comunidad, en lo más alto.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Cada partido jugado en un torneo suma ELO al ranking de tu comunidad. Cuatro
            temporadas paralelas para que siempre tengas algo por qué pelear.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { label: 'Mensual', desc: 'Reseteo cada mes', color: 'court' },
              { label: 'Trimestral', desc: 'Q1·Q2·Q3·Q4', color: 'pulse' },
              { label: 'Semestral', desc: 'S1 y S2', color: 'smash' },
              { label: 'Anual', desc: 'La gran corona', color: 'pulse' },
            ].map((item) => (
              <Card key={item.label} className="p-4">
                <div className="font-display text-xl font-semibold">{item.label}</div>
                <div className="text-muted-foreground text-sm">{item.desc}</div>
              </Card>
            ))}
          </div>
        </div>

        <CommunityRankingPreview />
      </div>
    </section>
  );
}

function Communities({
  communities,
}: {
  communities: { name: string; city: string; members: number; badge: string }[];
}) {
  return (
    <section id="comunidades" className="border-t border-border/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <Badge>Comunidades fundadoras</Badge>
            <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Tu parche, club o crew. Bienvenidos.
            </h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/communities">
              Ver todas
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {communities.map((c) => (
            <Card key={c.name} className="group overflow-hidden">
              <div className="from-court/30 to-pulse/30 relative aspect-[5/3] bg-gradient-to-br">
                <div className="absolute inset-0 grain opacity-30" />
                <div className="absolute bottom-3 right-3 text-xs">
                  <Badge variant="outline" className="bg-background/80 backdrop-blur">
                    {c.badge}
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{c.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Globe className="size-3.5" />
                  {c.city} · {c.members} miembros
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-border/40">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--pulse)_25%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="font-display text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          Tu parche es la mejor cancha.
          <br />
          <span className="text-pulse">Demuéstralo.</span>
        </h2>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
          Padel Pulse está en beta privada para Bogotá. Pide acceso y reservamos cupo a tu
          comunidad para el torneo de lanzamiento.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="pulse" size="xl" asChild>
            <Link href="/signup">
              Pedir acceso
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="https://wa.me/573000000000" target="_blank">
              Hablar por WhatsApp
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <PulseLogo />
          <span className="font-display font-semibold">
            Padel <span className="text-pulse">Pulse</span>
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/terms">Términos</Link>
          <Link href="mailto:hola@padelpulse.co">hola@padelpulse.co</Link>
          <Link
            href="https://github.com/juanvergara-dev/padel-pulse"
            className="flex items-center gap-1"
          >
            <Github className="size-4" /> GitHub
          </Link>
        </div>
        <div className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Padel Pulse — Hecho en 🇨🇴
        </div>
      </div>
    </footer>
  );
}

function PulseLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="url(#g)" />
      <path
        d="M8 16h4l2-5 4 10 2-5h4"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--court)" />
          <stop offset="100%" stopColor="var(--pulse)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
