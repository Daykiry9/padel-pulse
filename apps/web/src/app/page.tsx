import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Crown,
  Flame,
  Github,
  Globe,
  LineChart,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CommunityRankingPreview } from '@/components/marketing/community-ranking-preview';
import { TournamentCardPreview } from '@/components/marketing/tournament-card-preview';
import { LiveScoreboardPreview } from '@/components/marketing/live-scoreboard-preview';
import { KingLogo } from '@/components/marketing/king-logo';

const featuredCommunities = [
  { name: 'Bogotá Pádel Circuit', city: 'Bogotá', teams: 38, badge: 'Top BOG' },
  { name: 'Norte Pádel Liga', city: 'Bogotá', teams: 27, badge: 'Club' },
  { name: 'Valkiria Queens', city: 'Bogotá', teams: 19, badge: 'Queens' },
  { name: 'Antioquia Pádel', city: 'Medellín', teams: 22, badge: 'Crew' },
];

export default function HomePage() {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <SiteHeader />
      <Hero />
      <DualBrand />
      <Marquee />
      <HowItWorks />
      <Showcase />
      <Categories />
      <Rankings />
      <Communities communities={featuredCommunities} />
      <Monetization />
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
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-7 text-xs uppercase tracking-widest md:flex">
          <Link href="#como-funciona" className="hover:text-foreground transition-colors">
            Cómo funciona
          </Link>
          <Link href="#torneos" className="hover:text-foreground transition-colors">
            Torneos
          </Link>
          <Link href="#categorias" className="hover:text-foreground transition-colors">
            Categorías
          </Link>
          <Link href="#ranking" className="hover:text-foreground transition-colors">
            Ranking
          </Link>
          <Link href="/queens" className="text-queens hover:brightness-125 transition-[border-color,background-color]">
            Queens →
          </Link>
        </nav>
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
      <div
        className="absolute right-0 top-1/3 -z-10 h-[480px] w-[480px] translate-x-1/3 rounded-full bg-queens/10 blur-3xl"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-8">
            <Badge variant="crown" className="px-3 py-1">
              <Crown className="size-3" />
              Liga amateur · Bogotá · Beta privada
            </Badge>

            <h1 className="font-display text-balance text-5xl leading-[0.95] tracking-tight md:text-7xl">
              LA LIGA DEL{' '}
              <span className="text-crown">PÁDEL</span>{' '}
              COLOMBIANO.
            </h1>

            <p className="text-muted-foreground max-w-xl text-balance text-lg md:text-xl">
              Crea tu equipo, únete a tu comunidad, juega torneos americanos y de eliminación, y
              sube en el ranking por categoría —{' '}
              <strong className="text-foreground">1ra a 5ta + Mixto + Queens 1 a 5</strong>.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button variant="crown" size="xl" asChild>
                <Link href="/signup">
                  Arma tu equipo
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/tournaments">
                  Ver torneos abiertos
                </Link>
              </Button>
            </div>

            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-live animate-pulse" /> 3 clubes en beta
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-4" />
                40+ equipos fundadores
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="size-4 text-crown" />
                Copa apertura · Jun 2026
              </span>
            </div>
          </div>

          <LiveScoreboardPreview />
        </div>
      </div>
    </section>
  );
}

function DualBrand() {
  return (
    <section className="border-y border-border/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="relative overflow-hidden border-border/40 px-6 py-10 md:border-r">
          <Crown className="text-crown/20 absolute -right-2 -top-2 size-32" />
          <div className="relative">
            <Badge variant="crown">PadelKing</Badge>
            <h3 className="font-display mt-4 text-2xl tracking-tight md:text-3xl">
              MASCULINO + MIXTO
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              5 categorías (1ra a 5ta) + mixto. Circuito principal, sponsors masculinos, premios
              propios.
            </p>
          </div>
        </div>
        <div className="theme-queens relative overflow-hidden px-6 py-10">
          <Crown className="text-queens/20 absolute -right-2 -top-2 size-32" />
          <div className="relative">
            <Badge variant="queens">PadelQueens</Badge>
            <h3 className="font-display mt-4 text-2xl tracking-tight md:text-3xl">
              FEMENINO
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Queens 1 a 5. Universo paralelo con ranking, sponsors y premios propios. Paridad
              estructural, no afterthought.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    'Bogotá Pádel Circuit',
    'Norte Pádel Liga',
    'Valkiria Queens',
    'Antioquia Pádel',
    'Spimpad',
    'La Pala',
    'Cartagena Pádel',
    'Pacífico Crew',
    'Club Tejar',
  ];
  return (
    <section className="bg-muted/30 overflow-hidden border-b border-border/40 py-5">
      <div className="text-muted-foreground mx-auto mb-3 max-w-6xl px-6 text-center text-[10px] uppercase tracking-[0.3em]">
        Comunidades y clubes fundadores
      </div>
      <div className="relative flex overflow-hidden">
        <div className="flex animate-[scroll_40s_linear_infinite] gap-12 px-6 whitespace-nowrap [&>*]:shrink-0">
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
      title: '01 · Arma tu equipo',
      desc: 'Invita a tu pareja de pádel. Un equipo = 2 jugadores fijos. Histórico preservado si cambias después.',
    },
    {
      icon: Globe,
      title: '02 · Únete a tu comunidad',
      desc: 'Comunidades organizan calendarios, clubes ofrecen sus canchas. Tú juegas. Sin Excel, sin WhatsApp.',
    },
    {
      icon: Zap,
      title: '03 · Inscríbete a torneos',
      desc: 'Americano, Express, Liga o eliminación directa. Bracket auto-generado, marcador en vivo.',
    },
    {
      icon: Crown,
      title: '04 · Sube en el ranking',
      desc: 'ELO + puntos absolutos por torneo. Ranking dual: dentro de tu comunidad y entre comunidades. Mes a mes.',
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <Badge>Cómo funciona</Badge>
        <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
          4 HORAS DE WHATSAPP &rarr;<br />
          <span className="text-crown">4 MINUTOS</span> DE PADELKING.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          PadelKing es el sistema operativo de las comunidades amateur de pádel: el calendario, el
          ranking, el pago, las inscripciones, el bracket en vivo. Todo en un solo lugar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <Card
            key={step.title}
            className="hover:border-crown/40 transition-[border-color,background-color] hover:border-foreground/20"
          >
            <CardHeader>
              <div className="bg-crown/10 text-crown mb-3 flex size-10 items-center justify-center rounded-lg">
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
    <section id="torneos" className="border-y border-border/40 bg-muted/20 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <Badge variant="crown">Torneos</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            4 FORMATOS.<br />
            <span className="text-crown">UN SOLO BRACKET.</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Americano, Express, Liga (fechas múltiples) o eliminación directa. PadelKing genera el
            bracket en segundos, te avisa tu próxima pista y publica el resultado en vivo.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Bracket auto-generado desde 8 hasta 32 equipos',
              'Marcador con confirmación cruzada (sin disputas)',
              'Modo espectador en vivo proyectable en pantalla del club',
              'Sponsor slot por torneo: logo, premios, exposure tracking',
              'Stories de podio auto-generadas para Instagram',
              'Pagos por equipo con split automático al organizador (próximamente)',
            ].map((feat) => (
              <li key={feat} className="text-foreground/90 flex items-start gap-3">
                <Sparkles className="text-crown mt-1 size-4 shrink-0" />
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

function Categories() {
  const categories = [
    { name: '1ra', desc: 'Élite', tone: 'crown' },
    { name: '2da', desc: 'Avanzados', tone: 'crown' },
    { name: '3ra', desc: 'Intermedios+', tone: 'crown' },
    { name: '4ta', desc: 'Intermedios', tone: 'crown' },
    { name: '5ta', desc: 'Iniciación', tone: 'crown' },
    { name: 'Mixto', desc: '1 + 1', tone: 'data' },
    { name: 'Queens 1', desc: 'Élite F', tone: 'queens' },
    { name: 'Queens 2', desc: 'Avanzadas', tone: 'queens' },
    { name: 'Queens 3', desc: 'Intermedias+', tone: 'queens' },
    { name: 'Queens 4', desc: 'Intermedias', tone: 'queens' },
    { name: 'Queens 5', desc: 'Iniciación F', tone: 'queens' },
  ] as const;
  return (
    <section id="categorias" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <Badge variant="data">Categorías</Badge>
        <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
          11 CATEGORÍAS.<br />
          <span className="text-crown">UNA COLA DIFERENTE</span> POR PELEAR.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          El sistema sugiere ascensos y descensos por puntos. El organizador aprueba con un click.
          Categorías masculinas/mixtas separadas de Queens: paridad estructural.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <Card
            key={c.name}
            className={
              c.tone === 'queens'
                ? 'border-queens/20 bg-queens/[0.03]'
                : c.tone === 'data'
                  ? 'border-data/20 bg-data/[0.03]'
                  : 'border-crown/20 bg-crown/[0.03]'
            }
          >
            <CardHeader className="p-4">
              <div
                className={
                  c.tone === 'queens'
                    ? 'font-display text-queens text-2xl'
                    : c.tone === 'data'
                      ? 'font-display text-data text-2xl'
                      : 'font-display text-crown text-2xl'
                }
              >
                {c.name}
              </div>
              <CardDescription className="text-xs">{c.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Rankings() {
  return (
    <section id="ranking" className="border-y border-border/40 bg-muted/20 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        <div>
          <Badge variant="success">Ranking dual</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            INTERNO + ENTRE COMUNIDADES.<br />
            <span className="text-crown">4 PERÍODOS.</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            ELO continuo para match-by-match, puntos absolutos por torneo (1er=1000, 2do=600,
            3er=400…) con decaimiento de 12 meses. El ranking de comunidad agrega el top-N de sus
            equipos.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { label: 'Mensual', desc: 'Reseteo cada mes' },
              { label: 'Trimestral', desc: 'Q1·Q2·Q3·Q4' },
              { label: 'Semestral', desc: 'S1 y S2' },
              { label: 'Anual', desc: 'La gran corona' },
            ].map((item) => (
              <Card key={item.label} className="p-4">
                <div className="font-display text-crown text-xl">{item.label}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-widest">
                  {item.desc}
                </div>
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
  communities: { name: string; city: string; teams: number; badge: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <Badge>Comunidades fundadoras</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            COMUNIDADES <span className="text-crown">REALES.</span>
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
            <div className="relative aspect-[5/3] bg-gradient-to-br from-crown/20 via-background to-background">
              <div className="grain absolute inset-0 opacity-30" />
              <div className="absolute bottom-3 right-3">
                <Badge
                  variant={c.badge === 'Queens' ? 'queens' : 'outline'}
                  className="bg-background/80 backdrop-blur"
                >
                  {c.badge}
                </Badge>
              </div>
              <Crown className="text-crown/40 absolute right-3 top-3 size-5" />
            </div>
            <CardHeader>
              <CardTitle className="text-base">{c.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 normal-case">
                <Globe className="size-3.5" />
                {c.city} · {c.teams} equipos
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Monetization() {
  const lines = [
    { icon: Calendar, label: 'Mes 1', title: 'Comisión por inscripción', desc: '5% sobre cada pago de equipo al torneo' },
    { icon: Sparkles, label: 'Mes 6', title: 'Sponsor slots', desc: 'Marcas patrocinan torneos con exposure tracking' },
    { icon: LineChart, label: 'Año 1', title: 'Clubes Premium', desc: 'Sede verificada, analytics propios' },
    { icon: Crown, label: 'Año 1.5', title: 'PadelKing Pro', desc: 'Freemium para equipos competitivos' },
  ];
  return (
    <section className="border-y border-border/40 bg-muted/20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <Badge variant="data">Roadmap de negocio</Badge>
          <h2 className="font-display mt-4 text-4xl tracking-tight md:text-5xl">
            4 LÍNEAS DE NEGOCIO.<br />
            <span className="text-crown">UN SOLO ECOSISTEMA.</span>
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {lines.map((l) => (
            <Card key={l.title} className="p-6">
              <l.icon className="text-crown size-6" />
              <div className="text-muted-foreground mt-4 text-[10px] uppercase tracking-widest">
                {l.label}
              </div>
              <div className="font-display text-base mt-1">{l.title}</div>
              <div className="text-muted-foreground mt-2 text-sm">{l.desc}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,197,61,0.15),transparent_70%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <Crown className="text-crown mx-auto size-12" />
        <h2 className="font-display mt-6 text-balance text-4xl tracking-tight md:text-6xl">
          LA CORONA ESPERA.<br />
          <span className="text-crown">VAS POR ELLA?</span>
        </h2>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
          PadelKing está en beta privada en Bogotá. Pide acceso y reservamos cupo a tu comunidad
          para la copa de apertura.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="crown" size="xl" asChild>
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
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
            <span className="text-muted-foreground mx-2">·</span>
            <span className="text-queens">QUEENS</span>
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-widest">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/terms">Términos</Link>
          <Link href="mailto:hola@padelking.co">hola@padelking.co</Link>
          <Link
            href="https://github.com/Daykiry9/padelking"
            className="flex items-center gap-1"
          >
            <Github className="size-4" /> GitHub
          </Link>
        </div>
        <div className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} PadelKing — Hecho en 🇨🇴
        </div>
      </div>
    </footer>
  );
}
