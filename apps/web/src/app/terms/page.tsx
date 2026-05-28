import type { Metadata } from 'next';
import Link from 'next/link';

import { KingLogo } from '@/components/marketing/king-logo';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso de PadelKing.',
};

export default function TermsPage() {
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
        <h1 className="font-display text-3xl tracking-tight">TÉRMINOS Y CONDICIONES</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          Última actualización: 25 de mayo de 2026
        </p>

        <Section title="1. Aceptación">
          <p>
            Al registrarte y usar PadelKing (la &quot;Plataforma&quot;), aceptas estos términos. Si
            no estás de acuerdo, no la uses. La Plataforma es operada desde Bogotá D.C., Colombia.
          </p>
        </Section>

        <Section title="2. Edad mínima">
          <p>
            Debes tener al menos 13 años para usar la Plataforma. Entre 13 y 17 años requieres
            consentimiento parental.
          </p>
        </Section>

        <Section title="3. Tu cuenta">
          <ul>
            <li>
              Eres responsable de la veracidad de tu información (categoría, ranking, comunidad,
              etc.).
            </li>
            <li>No puedes compartir tu cuenta ni suplantar a otros jugadores.</li>
            <li>
              Si detectas uso no autorizado de tu cuenta, debes notificarlo de inmediato a{' '}
              <a href="mailto:hola@padelking.co">hola@padelking.co</a>.
            </li>
          </ul>
        </Section>

        <Section title="4. Uso aceptable">
          <p>Al usar PadelKing aceptas no:</p>
          <ul>
            <li>Publicar contenido ilegal, ofensivo, discriminatorio o que incite al odio.</li>
            <li>Acosar, intimidar o difamar a otros jugadores u organizadores.</li>
            <li>Falsificar resultados de partidos o manipular el sistema de ranking.</li>
            <li>
              Usar bots, scripts o medios automatizados para inscribirte, jugar o influir en
              torneos.
            </li>
            <li>Vulnerar la seguridad de la Plataforma o intentar acceder a datos ajenos.</li>
          </ul>
          <p>
            El incumplimiento puede resultar en suspensión o eliminación de la cuenta y, según la
            gravedad, en acciones legales.
          </p>
        </Section>

        <Section title="5. Contenido del usuario">
          <p>
            Tú conservas la propiedad del contenido que subes (foto de perfil, comentarios, etc.).
            Nos concedes una licencia mundial, no exclusiva y gratuita para mostrarlo dentro de la
            Plataforma con el fin de operar el servicio (perfiles públicos, rankings, historial de
            partidos).
          </p>
        </Section>

        <Section title="6. Torneos y comunidades">
          <p>
            Los torneos son organizados por usuarios o clubes aliados. PadelKing actúa como
            plataforma facilitadora — no somos responsables por:
          </p>
          <ul>
            <li>La cancelación, modificación o calidad de los torneos publicados.</li>
            <li>Disputas sobre resultados, premios o conducta entre jugadores.</li>
            <li>Pagos o cobros gestionados por organizadores fuera de la Plataforma.</li>
          </ul>
          <p>
            Cuando integremos pagos in-app, este documento se actualizará con los términos
            comerciales correspondientes.
          </p>
        </Section>

        <Section title="7. Propiedad intelectual">
          <p>
            La marca PadelKing, PadelQueens, el logo de la corona y la paleta, el diseño visual y el
            sistema de ranking son propiedad de PadelKing. No pueden replicarse ni usarse
            comercialmente sin autorización escrita.
          </p>
        </Section>

        <Section title="8. Limitación de responsabilidad">
          <p>
            PadelKing se ofrece &quot;tal cual&quot;. No garantizamos que el servicio esté libre de
            errores o interrupciones. En la máxima medida permitida por la ley, no somos
            responsables por daños indirectos, lucro cesante o daños emergentes derivados del uso de
            la Plataforma.
          </p>
        </Section>

        <Section title="9. Modificaciones del servicio">
          <p>
            Podemos modificar, suspender o discontinuar funciones de la Plataforma en cualquier
            momento. Si una funcionalidad de pago se discontinúa, te notificaremos con razonable
            antelación y, cuando aplique, te ofreceremos un reembolso prorrateado.
          </p>
        </Section>

        <Section title="10. Terminación">
          <p>
            Puedes cerrar tu cuenta en cualquier momento desde tu perfil. PadelKing puede suspender
            o terminar tu acceso si infringes estos términos.
          </p>
        </Section>

        <Section title="11. Ley aplicable y jurisdicción">
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier
            controversia se someterá a los jueces competentes de Bogotá D.C.
          </p>
        </Section>

        <Section title="12. Cambios a estos términos">
          <p>
            Notificaremos cambios sustanciales por email o dentro de la app. El uso continuado luego
            de los cambios constituye aceptación.
          </p>
        </Section>

        <Section title="13. Contacto">
          <p>
            Dudas, consultas o reportes:{' '}
            <a href="mailto:hola@padelking.co">hola@padelking.co</a>.
          </p>
        </Section>

        <p className="text-muted-foreground mt-12 text-xs">
          PadelKing · Bogotá D.C., Colombia ·{' '}
          <a href="mailto:hola@padelking.co">hola@padelking.co</a>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <div className="text-foreground/85 mt-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
