import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { signIn } from '@/lib/auth-actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verify?: string }>;
}) {
  const { next, verify } = await searchParams;

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
