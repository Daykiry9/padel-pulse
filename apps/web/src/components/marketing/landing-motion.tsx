'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import Lenis from 'lenis';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Scroll suave tipo Lenis solo en escritorio (puntero fino). En movil y en la
 * app nativa se queda el scroll nativo: Lenis sobre touch se siente pesado.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -80 } });
    let raf = requestAnimationFrame(function loop(t) {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}

/**
 * Titular que se revela palabra por palabra desde una mascara (estilo
 * SplitText). En CSS puro: arranca al pintar, sin esperar la hidratacion.
 */
export function RevealHeadline({ words, className }: { words: { text: string; accent?: boolean }[]; className?: string }) {
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span
              className={`animate-word-up inline-block ${w.accent ? 'text-crown' : ''}`}
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              {w.text}
            </span>
          </span>
        </Fragment>
      ))}
    </h1>
  );
}

/** Entrada al hacer scroll (fade + subida), una sola vez. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export type HeroTicketTournament = {
  slug: string;
  name: string;
  starts_at: string;
  max_teams: number;
  price_per_team: number;
  taken: number;
};

/**
 * Boleta 3D del proximo torneo real: se inclina con el puntero (escritorio) o
 * con el scroll (movil), con brillo de cristal que sigue la luz. Reemplaza la
 * pastilla "Proximo" del hero: el producto es el torneo, que se vea.
 * Cuenta regresiva, fecha y precio llegan renderizados del servidor (slots)
 * para no romper la hidratacion con la hora.
 */
export function HeroTicket({
  t,
  countdown,
  meta,
  price,
}: {
  t: HeroTicketTournament;
  countdown: ReactNode;
  meta: string;
  price: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const scrollTilt = useTransform(scrollYProgress, [0, 1], [10, -10]);

  const spring = { stiffness: 160, damping: 18, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-14, 14]), spring);
  const tiltX = useSpring(useTransform(py, [0, 1], [10, -10]), spring);
  const rotateX = useTransform([tiltX, scrollTilt], ([a = 0, b = 0]: number[]) => a + b * 0.6);
  const glareX = useTransform(px, [0, 1], ['0%', '100%']);
  const glareY = useTransform(py, [0, 1], ['0%', '100%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.16), transparent 55%)`;

  const left = t.max_teams - t.taken;
  const almostFull = left > 0 && left <= Math.max(2, Math.ceil(t.max_teams * 0.25));

  return (
    <div className="[perspective:1200px]">
      <motion.div
        initial={{ opacity: 0, y: 60, rotateX: 25 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.45 }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.a
            ref={ref}
            href={`/tournaments/${t.slug}`}
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse') return;
              const r = e.currentTarget.getBoundingClientRect();
              px.set((e.clientX - r.left) / r.width);
              py.set((e.clientY - r.top) / r.height);
            }}
            onPointerLeave={() => {
              px.set(0.5);
              py.set(0.5);
            }}
            style={reduce ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="focus-card border-crown/40 bg-card/70 shadow-glow-crown group relative block overflow-hidden rounded-[28px] border text-left backdrop-blur-xl"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10"
              style={{ background: glare }}
            />
            <div className="court-grid absolute inset-0 opacity-60" aria-hidden />

            <div className="relative p-6 pb-5">
              <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest">
                <span className="text-live flex items-center gap-1.5 font-semibold">
                  <span className="bg-live size-1.5 animate-pulse rounded-full" />
                  Próximo torneo
                </span>
                {countdown}
              </div>
              <div className="font-display mt-4 line-clamp-3 text-3xl leading-[0.95] tracking-tight md:text-4xl">
                {t.name.toUpperCase()}
              </div>
              <div className="text-muted-foreground mt-3 flex items-baseline justify-between gap-3 text-xs uppercase tracking-widest">
                <span>{meta}</span>
                {price}
              </div>
            </div>

            {/* Perforacion con muescas de boleta */}
            <div className="relative" aria-hidden>
              <div className="border-crown/40 mx-6 border-t-2 border-dashed" />
              <span className="bg-background border-crown/40 absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full border" />
              <span className="bg-background border-crown/40 absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full border" />
            </div>

            <div className="relative space-y-3 p-6 pt-5">
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: t.max_teams }, (_, i) => (
                  <motion.span
                    key={i}
                    className={`h-2 flex-1 origin-left rounded-full ${
                      i < t.taken ? (almostFull ? 'bg-live' : 'bg-crown') : 'bg-muted-foreground/20'
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, ease: EASE, delay: 1 + i * 0.05 }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs uppercase tracking-widest ${almostFull ? 'text-live font-semibold' : 'text-muted-foreground'}`}
                >
                  {left === 0
                    ? 'Cupo completo'
                    : left === 1
                      ? '¡Queda 1 cupo!'
                      : `Quedan ${left} cupos`}
                </span>
                <span className="bg-crown text-primary-foreground inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-transform group-hover:translate-x-0.5">
                  Inscribirme
                  <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
          </motion.a>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Cinta infinita entre secciones (marquee). */
export function Marquee({ items }: { items: string[] }) {
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-8 uppercase">
          <span className={i % 2 ? 'text-crown' : ''}>{it}</span>
          <span className="bg-crown size-2 rotate-45" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="border-border/40 bg-card/40 font-display relative -rotate-1 overflow-hidden border-y py-4 text-2xl tracking-tight md:text-4xl">
      <span className="sr-only">{items.join(' · ')}</span>
      <div className="animate-marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}

/** Wordmark gigante del footer que sube con el scroll. */
export function GiantWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['45%', '0%']);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);
  return (
    <div ref={ref} className="overflow-hidden" aria-hidden>
      <motion.div
        style={{ y, opacity }}
        className="font-display select-none whitespace-nowrap text-center text-[15vw] leading-[0.8] tracking-tighter"
      >
        PADEL<span className="text-crown">KING</span>
      </motion.div>
    </div>
  );
}

/** Link con efecto magnetico (escritorio): el boton sigue un poco al cursor. */
export function MagneticLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  return (
    <motion.span
      className="inline-block"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.3);
        y.set((e.clientY - r.top - r.height / 2) * 0.3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.span>
  );
}
