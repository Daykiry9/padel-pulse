import type { Metadata } from 'next';
import Link from 'next/link';

import { KingLogo } from '@/components/marketing/king-logo';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Política de tratamiento de datos personales de PadelKing según la Ley 1581 de 2012 de Colombia.',
};

export default function PrivacyPage() {
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
        <h1 className="font-display text-3xl tracking-tight">POLÍTICA DE PRIVACIDAD</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">
          Última actualización: 25 de mayo de 2026
        </p>

        <Section title="1. Quién es el responsable">
          <p>
            PadelKing (en adelante &quot;la Plataforma&quot;) opera la app y el sitio web{' '}
            <code>padelking.co</code> dirigidos a la comunidad amateur del pádel en Colombia. El
            responsable del tratamiento de tus datos personales es el equipo de PadelKing, con
            domicilio en Bogotá D.C., Colombia. Para ejercer derechos o consultas, escribe a{' '}
            <a href="mailto:hola@padelking.co">hola@padelking.co</a>.
          </p>
        </Section>

        <Section title="2. Marco legal">
          <p>
            Esta política se rige por la Ley 1581 de 2012 y su decreto reglamentario 1377 de 2013
            (Régimen General de Protección de Datos Personales de Colombia), así como por las
            disposiciones aplicables del Habeas Data financiero cuando corresponda.
          </p>
        </Section>

        <Section title="3. Datos que recolectamos">
          <ul>
            <li>
              <strong>Identificación:</strong> nombre, email, fecha de nacimiento, ciudad, género,
              foto de perfil.
            </li>
            <li>
              <strong>Contacto:</strong> teléfono, usuario de Instagram.
            </li>
            <li>
              <strong>Deportivos:</strong> categoría, ELO, historial de partidos, ranking, equipos,
              clubes, comunidades.
            </li>
            <li>
              <strong>Técnicos:</strong> dirección IP, tipo de dispositivo, sistema operativo,
              identificadores de instalación de la app, logs de uso.
            </li>
            <li>
              <strong>Datos provistos opcionalmente:</strong> mano dominante, posición preferida,
              año en que empezaste a jugar.
            </li>
          </ul>
        </Section>

        <Section title="4. Para qué usamos tus datos">
          <ul>
            <li>Operar tu cuenta, crear equipos y permitir inscripciones a torneos.</li>
            <li>Calcular tu ranking, ELO y categoría sugerida.</li>
            <li>Mostrar tu perfil público (nombre, foto, ciudad, ranking) a otros usuarios.</li>
            <li>Enviarte notificaciones operativas (resultados, invitaciones, recordatorios).</li>
            <li>
              Comunicaciones de marketing si activaste el consentimiento — siempre con opción a
              dejar de recibirlas.
            </li>
            <li>Detectar abusos, fraudes y violaciones a los términos.</li>
            <li>Cumplir obligaciones legales y regulatorias.</li>
          </ul>
        </Section>

        <Section title="5. Compartir con terceros">
          <p>
            Tus datos se almacenan en infraestructura provista por <strong>Supabase</strong> (Postgres
            + Auth, ubicación AWS EU/US) y <strong>Vercel</strong> (hosting de la app web). Estos
            proveedores actúan como encargados del tratamiento bajo sus propios marcos de seguridad.
            No vendemos ni cedemos tus datos personales a terceros con fines publicitarios.
          </p>
          <p>
            Cuando integremos pasarelas de pago, marketing o analítica, este documento se actualizará
            para listar los procesadores adicionales.
          </p>
        </Section>

        <Section title="6. Tus derechos">
          <p>Como titular de los datos, puedes en cualquier momento:</p>
          <ul>
            <li>Conocer, actualizar o rectificar tus datos.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Revocar la autorización y/o solicitar la supresión de tus datos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).</li>
          </ul>
          <p>
            Para ejercerlos: escribe a <a href="mailto:hola@padelking.co">hola@padelking.co</a> con
            tu solicitud. Te responderemos en máximo 15 días hábiles.
          </p>
        </Section>

        <Section title="7. Conservación">
          <p>
            Mantenemos tus datos mientras tu cuenta esté activa o sean necesarios para cumplir las
            finalidades descritas. Si eliminas tu cuenta, tus datos personales se anonimizan en un
            plazo de 30 días, salvo aquellos que debamos conservar por obligación legal (registros
            contables, evidencia ante litigios, etc.).
          </p>
        </Section>

        <Section title="8. Menores de edad">
          <p>
            La Plataforma está disponible para mayores de 13 años. Si tienes menos de 18, debes
            contar con el consentimiento de tus padres o tutores para crear una cuenta.
          </p>
        </Section>

        <Section title="9. Cambios">
          <p>
            Podemos actualizar esta política. Te notificaremos los cambios sustanciales por email o
            dentro de la app. La fecha al inicio del documento indica la última versión vigente.
          </p>
        </Section>

        <p className="text-muted-foreground mt-12 text-xs">
          Versión 1.0 — borrador inicial pre-beta. Revisado por contraparte legal en{' '}
          <code>TODO antes de lanzamiento público</code>.
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
