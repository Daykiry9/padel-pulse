import Link from 'next/link';
import { Crown, Github, Instagram } from 'lucide-react';

import { KingLogo } from '@/components/marketing/king-logo';
import { isNativeApp } from '@/lib/native';

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { href: '/tournaments', label: 'Torneos' },
      { href: '/app', label: 'Mi panel' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { href: '#', label: 'Acerca' },
      { href: '#', label: 'Sponsors' },
      { href: '#', label: 'Carreras' },
      { href: 'mailto:hola@padelking.co', label: 'Contacto' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Términos' },
      { href: '#', label: 'Privacidad' },
      { href: '#', label: 'Cookies' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { href: '#', label: 'FAQ' },
      { href: '#', label: 'Soporte' },
      { href: '#', label: 'Blog' },
    ],
  },
];

export async function SiteFooter() {
  if (await isNativeApp()) return null;

  return (
    <footer className="border-border/40 bg-ink-900 border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <KingLogo />
              <span className="font-display text-lg tracking-tight">
                PADEL<span className="text-gold-400">KING</span>
              </span>
            </Link>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
              La liga amateur del pádel colombiano. Comunidades, torneos, ranking nacional. Para
              masculino + mixto (Kings) y femenino (Queens).
            </p>
            <div className="text-muted-foreground mt-6 flex items-center gap-3">
              <a
                href="https://instagram.com/padelking"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="hover:text-foreground transition-colors"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://github.com/Daykiry9/padel-pulse"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="hover:text-foreground transition-colors"
              >
                <Github className="size-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em]">
                {col.title}
              </div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-foreground/80 hover:text-foreground text-sm transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border/40 mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Crown className="text-gold-400 size-3" />© {new Date().getFullYear()} PadelKing · Hecho
            en Bogotá
          </div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
            v0.4 · beta privada
          </div>
        </div>
      </div>
    </footer>
  );
}
