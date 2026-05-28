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
          Versión 2.0 · Última actualización: 28 de mayo de 2026
        </p>

        <p className="text-foreground/85 mt-6 text-sm leading-relaxed">
          Esta política explica qué datos recolectamos cuando usás PadelKing (la
          &quot;Plataforma&quot;), para qué los usamos, con quién los compartimos y los derechos
          que tenés sobre ellos. Si algo no te queda claro, escribínos a{' '}
          <a href="mailto:hola@padelking.co">hola@padelking.co</a>.
        </p>

        <Section title="1. Quién es el responsable del tratamiento">
          <p>
            PadelKing opera la web <code>padelking.co</code> y las apps nativas (iOS y Android)
            dirigidas a la comunidad amateur del pádel. El responsable del tratamiento de tus
            datos personales es el equipo de PadelKing, con domicilio en Bogotá D.C., Colombia.
          </p>
          <ul>
            <li>
              <strong>Contacto general:</strong>{' '}
              <a href="mailto:hola@padelking.co">hola@padelking.co</a>
            </li>
            <li>
              <strong>Privacidad y datos:</strong>{' '}
              <a href="mailto:privacidad@padelking.co">privacidad@padelking.co</a>
            </li>
          </ul>
        </Section>

        <Section title="2. Marco legal">
          <p>
            Esta política se rige por la <strong>Ley 1581 de 2012</strong> y su decreto
            reglamentario 1377 de 2013 (Régimen General de Protección de Datos Personales de
            Colombia). Si vivís en la Unión Europea, también aplicamos las protecciones del
            Reglamento General de Protección de Datos (GDPR) en lo que sea pertinente.
          </p>
        </Section>

        <Section title="3. Datos que recolectamos">
          <p>Recolectamos solo los datos necesarios para que la Plataforma funcione:</p>
          <ul>
            <li>
              <strong>Identificación:</strong> nombre completo, email, fecha de nacimiento,
              ciudad, género, foto de perfil (opcional).
            </li>
            <li>
              <strong>Contacto:</strong> teléfono, usuario de Instagram (opcional pero
              recomendado para tagging en torneos).
            </li>
            <li>
              <strong>Autenticación:</strong> contraseña hasheada (no la almacenamos en texto
              plano) o, si usás Sign in with Apple / Google, el identificador único de ese
              proveedor.
            </li>
            <li>
              <strong>Datos deportivos:</strong> categoría, ELO, historial de partidos, ranking,
              equipos, clubes, comunidades.
            </li>
            <li>
              <strong>Opcionales (para sugerencias y sponsors):</strong> mano dominante, posición
              preferida en cancha, año en que empezaste a jugar.
            </li>
            <li>
              <strong>Técnicos:</strong> dirección IP, tipo de dispositivo, sistema operativo,
              identificadores de instalación de la app, logs de uso (errores, navegación
              agregada).
            </li>
            <li>
              <strong>Notificaciones push (en la app nativa):</strong> token del dispositivo, si
              activás las notificaciones.
            </li>
          </ul>
          <p>
            <strong>Lo que NO recolectamos:</strong> datos sensibles (salud, religión,
            orientación política), datos financieros (no integramos pagos directamente; cuando
            lo hagamos, esta política se actualizará), ni ubicación GPS continua.
          </p>
        </Section>

        <Section title="4. Para qué usamos tus datos">
          <ul>
            <li>Crear y operar tu cuenta.</li>
            <li>Permitir tu inscripción a torneos y comunidades.</li>
            <li>Calcular tu ranking, ELO y categoría sugerida.</li>
            <li>
              Mostrar tu perfil público (nombre, foto, ciudad, ranking) a otros usuarios de la
              Plataforma. Otros datos como teléfono o fecha de nacimiento <strong>no son
              públicos</strong>.
            </li>
            <li>
              Enviarte notificaciones operativas (resultados, invitaciones, recordatorios de
              torneo).
            </li>
            <li>
              Enviarte comunicaciones de marketing solo si lo aceptaste expresamente, con opción
              a darte de baja en cualquier momento.
            </li>
            <li>Detectar abusos, fraudes y violaciones a los términos.</li>
            <li>Cumplir obligaciones legales y regulatorias.</li>
          </ul>
        </Section>

        <Section title="5. Bases legales del tratamiento">
          <ul>
            <li>
              <strong>Consentimiento:</strong> al registrarte aceptás estos términos y esta
              política. Lo podés revocar cuando quieras eliminando tu cuenta o escribiéndonos.
            </li>
            <li>
              <strong>Ejecución del contrato:</strong> tratamos tus datos para prestarte el
              servicio que pediste (operar tu cuenta, inscribirte a torneos, etc.).
            </li>
            <li>
              <strong>Interés legítimo:</strong> para seguridad, prevención de fraude y mejora
              del producto, en la medida que esos intereses no afecten tus derechos.
            </li>
            <li>
              <strong>Obligación legal:</strong> cuando una autoridad competente nos lo exija.
            </li>
          </ul>
        </Section>

        <Section title="6. Sign in with Apple / Google (proveedores de identidad)">
          <p>
            Si elegís ingresar con Apple o Google, ese proveedor nos comparte un identificador
            único y, opcionalmente, tu email. Apple permite ocultar tu email real con su servicio
            de relay privado — nosotros respetamos esa elección y nunca intentamos resolver el
            email real.
          </p>
          <ul>
            <li>
              Solo recibimos: identificador del proveedor, nombre (la primera vez, si lo
              autorizás) y email (o el relay privado de Apple).
            </li>
            <li>
              Apple/Google <strong>no</strong> reciben información sobre cómo usás la app, qué
              torneos jugaste o tu ranking.
            </li>
            <li>
              Podés desvincular tu cuenta de Apple/Google desde la configuración de tu cuenta de
              ese proveedor en cualquier momento.
            </li>
          </ul>
        </Section>

        <Section title="7. Con quién compartimos tus datos">
          <p>
            Trabajamos con un grupo acotado de procesadores que actúan bajo nuestras
            instrucciones y con sus propios marcos de seguridad y privacidad. No vendemos ni
            cedemos tus datos personales a terceros con fines publicitarios.
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — base de datos, autenticación y almacenamiento de
              archivos. Infraestructura en AWS (US/UE). <a href="https://supabase.com/privacy">Política</a>.
            </li>
            <li>
              <strong>Vercel</strong> — hosting de la web. Infraestructura en US/UE.{' '}
              <a href="https://vercel.com/legal/privacy-policy">Política</a>.
            </li>
            <li>
              <strong>Apple Sign In</strong> — autenticación opcional (solo si la usás).{' '}
              <a href="https://www.apple.com/legal/privacy/">Política</a>.
            </li>
          </ul>
          <p>
            Si en el futuro integramos pagos, analítica o push notifications, esta sección se
            actualizará antes de que esos procesadores reciban tus datos.
          </p>
        </Section>

        <Section title="8. Transferencias internacionales">
          <p>
            Algunos de nuestros procesadores (Supabase, Vercel, Apple) alojan datos fuera de
            Colombia, principalmente en Estados Unidos y/o la Unión Europea. Estas
            transferencias se hacen bajo las cláusulas contractuales estándar y los marcos de
            adecuación que esos proveedores publican, que ofrecen un nivel de protección
            equivalente al exigido por la ley colombiana.
          </p>
        </Section>

        <Section title="9. Seguridad">
          <ul>
            <li>Todas las comunicaciones se cifran en tránsito con TLS (HTTPS).</li>
            <li>
              Las contraseñas se guardan con hash seguro (bcrypt-style en Supabase Auth). No
              tenemos acceso a tu contraseña en texto plano.
            </li>
            <li>
              El acceso a la base de datos está protegido por Row Level Security: cada usuario
              ve solo lo que le corresponde.
            </li>
            <li>
              El acceso interno a datos personales por parte del equipo está limitado al mínimo
              necesario y queda registrado.
            </li>
            <li>
              Si detectamos un incidente que afecte tus datos personales, te notificaremos sin
              demora indebida y reportaremos a la SIC cuando corresponda.
            </li>
          </ul>
        </Section>

        <Section title="10. Cuánto tiempo conservamos tus datos">
          <p>
            Conservamos tus datos personales mientras tu cuenta esté activa o el tiempo
            necesario para cumplir las finalidades descritas. Si eliminás tu cuenta:
          </p>
          <ul>
            <li>
              Tus datos personales (nombre, email, teléfono, etc.) se anonimizan en un plazo
              máximo de <strong>30 días</strong>.
            </li>
            <li>
              Tu historial deportivo (partidos, marcadores, ranking) puede conservarse de forma
              anonimizada para integridad estadística de la Plataforma (los rivales jugaron sus
              partidos contra alguien — esos partidos no se borran, pero quedan sin tu
              identidad).
            </li>
            <li>
              Algunos datos podemos conservarlos más tiempo si una obligación legal nos lo
              exige (por ejemplo, evidencia ante litigios o requerimientos judiciales).
            </li>
          </ul>
        </Section>

        <Section title="11. Tus derechos (ARCO + Ley 1581)">
          <p>Como titular de los datos, en cualquier momento podés:</p>
          <ul>
            <li>
              <strong>Acceder</strong> a los datos que tenemos sobre vos.
            </li>
            <li>
              <strong>Rectificar</strong> o actualizar datos incorrectos o desactualizados.
            </li>
            <li>
              <strong>Solicitar la supresión</strong> de tus datos y la eliminación de tu cuenta.
            </li>
            <li>
              <strong>Revocar el consentimiento</strong> para los tratamientos que dependen de
              él.
            </li>
            <li>
              <strong>Solicitar prueba</strong> de la autorización otorgada.
            </li>
            <li>
              Presentar <strong>quejas ante la Superintendencia de Industria y Comercio
              (SIC)</strong> de Colombia.
            </li>
          </ul>
        </Section>

        <Section title="12. Cómo eliminar tu cuenta y tus datos">
          <p>
            Podés solicitar la eliminación total de tu cuenta y datos personales por cualquiera
            de estos canales:
          </p>
          <ol>
            <li>
              Desde la app o la web: <strong>Perfil → Zona peligrosa → Eliminar mi cuenta</strong>.
              Te pide confirmación tipeada y borra tus datos personales y tu acceso.
            </li>
            <li>
              Por email a{' '}
              <a href="mailto:privacidad@padelking.co">privacidad@padelking.co</a> con el asunto
              &quot;Eliminar mi cuenta&quot;, desde el correo registrado en la Plataforma.
            </li>
          </ol>
          <p>
            Respondemos en un plazo máximo de <strong>15 días hábiles</strong>. La eliminación
            efectiva ocurre dentro de 30 días desde la confirmación.
          </p>
        </Section>

        <Section title="13. Cookies y almacenamiento local">
          <p>
            Usamos cookies estrictamente necesarias para mantener tu sesión iniciada (después
            del login) y guardar preferencias mínimas. <strong>No usamos cookies de
            seguimiento publicitario de terceros.</strong> Si en el futuro integramos analítica
            o publicidad, te lo informaremos y, donde aplique, pediremos tu consentimiento.
          </p>
        </Section>

        <Section title="14. Menores de edad">
          <p>
            La Plataforma está disponible para mayores de 13 años. Entre 13 y 17 requieres
            consentimiento de tus padres o tutores. No recolectamos a sabiendas datos
            personales de menores de 13 años; si descubrimos un registro de un menor de 13, lo
            eliminamos.
          </p>
        </Section>

        <Section title="15. Notificaciones">
          <ul>
            <li>
              <strong>Operativas</strong> (resultado de un partido, invitación a un torneo,
              confirmación pendiente): forman parte del servicio.
            </li>
            <li>
              <strong>Push en la app nativa</strong>: las podés activar o desactivar desde la
              configuración del sistema de tu dispositivo en cualquier momento.
            </li>
            <li>
              <strong>Marketing</strong>: solo si activaste el consentimiento al registrarte o
              después. Cada comunicación incluye una opción para darte de baja.
            </li>
          </ul>
        </Section>

        <Section title="16. Cambios a esta política">
          <p>
            Podemos actualizar esta política cuando agreguemos funciones nuevas, cambien las
            normas aplicables o ajustemos a quienes les confiamos datos. Los cambios
            sustanciales se anuncian por email o dentro de la app antes de que entren en
            vigor. La fecha al inicio del documento siempre indica la última versión vigente.
          </p>
        </Section>

        <Section title="17. Autoridad de control">
          <p>
            En Colombia, la autoridad competente en protección de datos es la{' '}
            <strong>Superintendencia de Industria y Comercio (SIC)</strong>. Si considerás que
            no atendimos tu solicitud de forma adecuada, podés presentar una queja en{' '}
            <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">
              www.sic.gov.co
            </a>
            .
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
