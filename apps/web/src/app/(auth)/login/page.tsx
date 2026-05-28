import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { OAuthButtons } from '@/components/oauth-buttons';
import { signIn } from '@/lib/auth-actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verify?: string; oauth_error?: string }>;
}) {
  const { next, verify, oauth_error: oauthError } = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">INGRESAR</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ¿Primera vez?{' '}
          <Link href="/signup" className="text-crown underline">
            Crea tu cuenta
          </Link>
          .
        </p>
      </div>

      {verify && (
        <div className="border-crown/30 bg-crown/5 text-foreground rounded-lg border p-4 text-sm">
          <p className="font-semibold">Confirma tu email</p>
          <p className="text-muted-foreground mt-1">
            Te enviamos un correo de confirmación. Ábrelo y haz click en el link, luego vuelve aquí
            a ingresar.
          </p>
        </div>
      )}

      {oauthError && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-xs">
          No pudimos completar el inicio de sesión con el proveedor. Intentá de nuevo o usá email/contraseña.
        </div>
      )}

      <OAuthButtons next={next} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2 tracking-widest">o</span>
        </div>
      </div>

      <ActionForm action={signIn}>
        {next && <input type="hidden" name="next" value={next} />}

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

        <FormField label="Contraseña" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </FormField>

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Ingresando…">
          Ingresar
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
