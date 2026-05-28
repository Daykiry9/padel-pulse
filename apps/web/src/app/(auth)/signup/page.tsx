import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { OAuthButtons } from '@/components/oauth-buttons';
import { signUp } from '@/lib/auth-actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">CREAR CUENTA</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link
            href={invite ? `/login?next=/i/${invite}` : '/login'}
            className="text-crown underline"
          >
            Ingresa aquí
          </Link>
          .
        </p>
        {invite && (
          <div className="border-crown/30 bg-crown/[0.05] text-foreground mt-4 rounded-lg border p-3 text-xs">
            ✨ Te invitaron a PadelKing. Crea tu cuenta y completa tu perfil para entrar al torneo
            / equipo / comunidad.
          </div>
        )}
      </div>

      <OAuthButtons next={invite ? `/i/${invite}` : '/onboarding'} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2 tracking-widest">o</span>
        </div>
      </div>

      <ActionForm action={signUp}>
        {invite && <input type="hidden" name="invite" value={invite} />}

        <FormField label="Nombre" htmlFor="display_name" hint="Cómo te conocen tus amigos">
          <Input id="display_name" name="display_name" required placeholder="Juanes Rodríguez" />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </FormField>

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Creando…">
          Crear cuenta
        </SubmitButton>

        <p className="text-muted-foreground text-center text-xs normal-case">
          Al crear tu cuenta aceptás los{' '}
          <Link href="/terms" target="_blank" className="text-crown underline">
            Términos
          </Link>{' '}
          y la{' '}
          <Link href="/privacy" target="_blank" className="text-crown underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </ActionForm>
    </div>
  );
}
