import type { Metadata } from 'next';
import Link from 'next/link';

import { KingLogo } from '@/components/marketing/king-logo';

export const metadata: Metadata = {
  title: 'Eliminar tu cuenta',
  description:
    'Cómo eliminar tu cuenta de PadelKing y los datos asociados, qué se borra y qué se conserva.',
};

export default function EliminarCuentaPage() {
  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
      </header>

      <main className="prose prose-invert mx-auto max-w-3xl px-6 pb-24">
        <h1 className="font-display text-3xl tracking-tight">ELIMINAR TU CUENTA</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          PadelKing · Última actualización: julio de 2026
        </p>

        <p className="text-foreground/85 mt-6 text-sm leading-relaxed">
          Esta página explica cómo solicitar la eliminación de tu cuenta de <strong>PadelKing</strong>{' '}
          (la app de torneos de pádel disponible en padelking.co, Google Play y App Store) y qué
          pasa con tus datos.
        </p>

        <h2 className="font-display mt-8 text-xl tracking-tight">
          Opción 1: desde la app (inmediato)
        </h2>
        <ol className="text-foreground/85 text-sm leading-relaxed">
          <li>Inicia sesión en PadelKing.</li>
          <li>
            Entra a <strong>Perfil</strong> (menú inferior o menú de usuario).
          </li>
          <li>
            Baja hasta <strong>&ldquo;Eliminar mi cuenta&rdquo;</strong> y tócalo.
          </li>
          <li>
            Escribe <strong>ELIMINAR</strong> para confirmar. Tu cuenta y tus datos personales se
            eliminan de inmediato.
          </li>
        </ol>

        <h2 className="font-display mt-8 text-xl tracking-tight">Opción 2: por correo</h2>
        <p className="text-foreground/85 text-sm leading-relaxed">
          Si no puedes acceder a la app, escríbenos desde el correo con el que te registraste a{' '}
          <a href="mailto:privacidad@padelking.co">privacidad@padelking.co</a> con el asunto
          &ldquo;Eliminar cuenta&rdquo;. Procesamos la solicitud en un plazo máximo de{' '}
          <strong>30 días</strong>.
        </p>

        <h2 className="font-display mt-8 text-xl tracking-tight">Qué datos se eliminan</h2>
        <ul className="text-foreground/85 text-sm leading-relaxed">
          <li>Tu perfil: nombre, correo, teléfono, fecha de nacimiento, Instagram, ciudad y foto.</li>
          <li>Tu categoría, ELO y estadísticas personales.</li>
          <li>Tus membresías a comunidades y equipos.</li>
          <li>La asociación entre tú y tus inscripciones a torneos.</li>
        </ul>

        <h2 className="font-display mt-8 text-xl tracking-tight">Qué se conserva y por cuánto</h2>
        <p className="text-foreground/85 text-sm leading-relaxed">
          Por integridad de los torneos ya jugados, los <strong>resultados de partidos</strong> de
          torneos finalizados se conservan de forma <strong>anonimizada</strong> (sin datos que te
          identifiquen). Los registros técnicos mínimos de seguridad se eliminan en un plazo máximo
          de <strong>90 días</strong>. No vendemos ni compartimos tus datos con terceros.
        </p>

        <p className="text-foreground/85 mt-8 text-sm leading-relaxed">
          Más detalle en nuestra{' '}
          <Link href="/privacy" className="text-crown underline">
            Política de Privacidad
          </Link>
          . Dudas: <a href="mailto:hola@padelking.co">hola@padelking.co</a>.
        </p>
      </main>
    </div>
  );
}
