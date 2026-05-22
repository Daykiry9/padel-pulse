import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Crown,
  Github,
  Globe,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QueensLogo } from '@/components/marketing/queens-logo';
import { PalaSilhouette } from '@/components/marketing/pala-silhouette';

const featuredCommunities = [
  { name: 'Valkiria Queens', city: 'Bogotá', teams: 19, badge: 'Top BOG' },
  { name: 'Pacífico Queens', city: 'Cali', teams: 14, badge: 'Crew' },
  { name: 'Antioquia Reinas', city: 'Medellín', teams: 16, badge: 'Club' },
  { name: 'Caribe Queens', city: 'Cartagena', teams: 11, badge: 'Beta' },
];

export default function QueensHomePage() {
  return (
    <div className="theme-queens">
      <main className="bg-background relative min-h-screen overflow-hidden">
        <SiteHeader />
        <Hero />
        <Marquee />
        <HowItWorks />
        <Categories />
        <Communities communities={featuredCommunities} />
        <FinalCta />
        <SiteFooter />
      </main>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/queens" className="flex items-center gap-2">
          <QueensLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-queens">QUEENS</span>
          </span>
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-7 text-xs uppercase tracking-widest md:flex">
          <Link href="#como-funciona" className="hover:text-foreground transition-colors">
            Cómo funciona
          </Link>
          <Link href="#categorias" className="hover:text-foreground transition-colors">
            Categorías
          </Link>
          <Link href="/queens/tournaments" className="hover:text-foreground transition-colors">
            Torneos
          </Link>
          <Link
            href="/"
            className="text-crown hover:brightness-125 transition-[color,filter]"
          >
            ← Kings
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button variant="queens" size="sm" asChild>
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
        className="absolute inset-x-0 top-0 -z-10 h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.18),transparent_60%)]"
        aria-hidden
      />
      <div
        className="absolute left-0 top-1/3 -z-10 h-[480px] w-[480px] -translate-x-1/3 rounded-full bg-crown/10 blur-3xl"
        aria-hidden
      />
      <PalaSilhouette
        className="text-queens/[0.05] absolute -right-24 top-12 -z-10 hidden size-[460px] rotate-[18deg] md:block"
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-8">
            <Badge variant="queens" className="px-3 py-1">
              <Crown className="size-3" />
              Liga amateur femenina · Bogotá · Beta privada
            </Badge>

            <h1 className="font-display text-balance text-5xl leading-[0.95] tracking-tight md:text-7xl">
              EL CIRCUITO <span className="text-queens">FEMENINO</span> DEL PÁDEL EN COLOMBIA.
            </h1>

            <p className="text-muted-foreground max-w-xl text-balance text-lg md:text-xl">
              Universo paralelo a PadelKing, con{' '}
              <strong className="text-foreground">ranking, sponsors y premios propios</strong>.
              Queens 1 a 5 + Libre. Paridad estructural, no afterthought.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="queens" size="xl" asChild>
                <Link href="/signup">
                  Únete a Queens
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/queens/tournaments">Ver torneos abiertos</Link>
              </Button>
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <span className="bg-live size-1.5 animate-pulse rounded-full" /> 2 clubes en beta
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                25+ jugadoras fundadoras
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="text-queens size-4" />
                Copa Queens · Jul 2026
              </span>
            </div>
          </div>

          <QueensHeroVisual />
        </div>
      </div>
    </section>
  );
}

function QueensHeroVisual() {
  return (
    <Card className="border-queens/30 from-queens/[0.08] to-background relative overflow-hidden bg-gradient-to-br p-6 md:p-8">
      <div className="grain absolute inset-0 opacity-20" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <Badge variant="queens">Queens · Libre</Badge>
          <Badge variant="muted" className="text-[10px]">
            En vivo
          </Badge>
        </div>

        <div className="mt-6">
          <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Final · Copa Queens Bogotá
          </div>

          <div className="mt-4 space-y-4">
            <Row name="Valkiria · M. González / P. Ortiz" score="6 · 4 · —" winner />
            <div className="border-border/40 border-t" />
            <Row name="Pacífico · S. Castaño / L. Ruiz" score="3 · 6 · —" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="ELO" value="1842" accent="text-queens" />
          <Stat label="Set" value="3°" />
          <Stat label="Tiempo" value="01:42" />
        </div>
      </div>
    </Card>
  );
}

function Row({
  name,
  score,
  winner = false,
}: {
  name: string;
  score: string;
  winner?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${winner ? '' : 'opacity-70'}`}>
      <div className="flex items-center gap-3">
        {winner ? <Crown className="text-queens size-4" /> : <span className="size-4" />}
        <span className="text-sm">{name}</span>
      </div>
      <span className="font-display text-lg tracking-tight">{score}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'text-foreground',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-muted-foreground text-[9px] uppercase tracking-widest">{label}</div>
      <div className={`font-display mt-1 text-xl tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

function Marquee() {
  const items = [
    'Valkiria Queens',
    'Pacífico Queens',
    'Antioquia Reinas',
    'Caribe Queens',
    'Cartagena Pádel F',
    'Bogotá Queens Club',
    'Norte Queens',
  ];
  return (
    <section className="bg-muted/30 border-border/40 overflow-hidden border-y py-5">
      <div className="text-muted-foreground mx-auto mb-3 max-w-6xl px-6 text-center text-[10px] uppercase tracking-[0.3em]">
        Comunidades Queens fundadoras
      </div>
      <div className="relative flex overflow-hidden">
        <div className="flex animate-[scroll_40s_linear_infinite] gap-12 whitespace-nowrap px-6 [&>*]:shrink-0">
          {[...items, ...items, ...items].map((item, i) => (
            <span key={i} className="font-display text-muted-foreground/50 text-2xl uppercase">
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
      title: '01 · Regístrate',
      desc: 'Crea tu perfil Queens. Ranking individual: en pádel femenino las parejas fijas son raras.',
    },
    {
      icon: Globe,
      title: '02 · Únete a tu comunidad',
      desc: 'Comunidades Queens organizan torneos y rondas casuales. Tú juegas, ellas operan.',
    },
    {
      icon: Zap,
      title: '03 · Inscríbete',
      desc: 'Con pareja estable, ad-hoc (1 vez) o como individual. Pareo automático por categoría.',
    },
    {
      icon: Crown,
      title: '04 · Conquista el ranking',
      desc: 'ELO + puntos absolutos con decaimiento 12 meses. Ranking Queens 100% separado.',
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <Badge variant="queens">Cómo funciona</Badge>
        <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
          MISMO MOTOR.<br />
          <span className="text-queens">LIGA PROPIA.</span>
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          PadelQueens corre sobre el mismo software que PadelKing pero con liga, ranking, sponsors y
          premios separados. Visibilidad propia, no &ldquo;categoría femenina&rdquo; al fondo del menú.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card
            key={step.title}
            className="hover:border-queens/40 transition-[border-color,background-color] hover:border-foreground/20"
          >
            <CardHeader>
              <div className="bg-queens/10 text-queens mb-3 flex size-10 items-center justify-center rounded-lg">
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

function Categories() {
  const categories = [
    { name: 'Queens Libre', desc: 'Pro / Élite' },
    { name: 'Queens 1', desc: 'Avanzadas' },
    { name: 'Queens 2', desc: 'Intermedias+' },
    { name: 'Queens 3', desc: 'Intermedias' },
    { name: 'Queens 4', desc: 'Iniciación+' },
    { name: 'Queens 5', desc: 'Iniciación' },
  ];
  return (
    <section id="categorias" className="border-border/40 bg-muted/20 border-y py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <Badge variant="queens">Categorías Queens</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            6 CATEGORÍAS.<br />
            <span className="text-queens">SUMAS</span> PARA MIX DE NIVELES.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Sistema de Sumas: una Queens 1 + una Queens 3 puede inscribirse a torneo Suma 4. El
            sistema sugiere ascensos por puntos; la organizadora aprueba con un click.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Card key={c.name} className="border-queens/20 bg-queens/[0.03]">
              <CardHeader className="p-4">
                <div className="font-display text-queens text-xl">{c.name}</div>
                <CardDescription className="text-xs">{c.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Communities({
  communities,
}: {
  communities: { name: string; city: string; teams: number; badge: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <Badge variant="queens">Comunidades fundadoras</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            REINAS <span className="text-queens">REALES.</span>
          </h2>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app/communities">
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {communities.map((c) => (
          <Card key={c.name} className="group overflow-hidden">
            <div className="from-queens/20 via-background to-background relative aspect-[5/3] bg-gradient-to-br">
              <div className="grain absolute inset-0 opacity-30" />
              <div className="absolute bottom-3 right-3">
                <Badge variant="queens" className="bg-background/80 backdrop-blur">
                  {c.badge}
                </Badge>
              </div>
              <Crown className="text-queens/40 absolute right-3 top-3 size-5" />
            </div>
            <CardHeader>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 normal-case">
                <Globe className="size-3.5" />
                {c.city} · {c.teams} jugadoras
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.15),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Crown className="text-queens mx-auto size-12" />
        <h2 className="font-display mt-6 text-balance text-4xl tracking-tight md:text-6xl">
          LA CORONA ES <span className="text-queens">SUYA.</span>
        </h2>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
          PadelQueens está en beta privada en Bogotá. Pide acceso y reservamos cupo para la Copa
          Queens de apertura.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="queens" size="xl" asChild>
            <Link href="/signup">
              Pedir acceso Queens
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="https://wa.me/573000000000" target="_blank">
              Hablar por WhatsApp
            </Link>
          </Button>
        </div>
        <div className="text-muted-foreground mt-10 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-widest">
          <Sparkles className="size-3.5" />
          También en PadelKing
          <Link href="/" className="text-crown hover:brightness-125 transition-[filter]">
            → Masculino + Mixto
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-border/40 bg-muted/20 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <QueensLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-queens">QUEENS</span>
            <span className="text-muted-foreground mx-2">·</span>
            <Link href="/" className="text-crown">KING</Link>
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-widest">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/terms">Términos</Link>
          <Link href="mailto:hola@padelqueens.co">hola@padelqueens.co</Link>
          <Link
            href="https://github.com/Daykiry9/padelking"
            className="flex items-center gap-1"
          >
            <Github className="size-4" /> GitHub
          </Link>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Calendar className="size-3.5" />
          {new Date().getFullYear()} PadelQueens · Hecho en CO
        </div>
      </div>
    </footer>
  );
}
