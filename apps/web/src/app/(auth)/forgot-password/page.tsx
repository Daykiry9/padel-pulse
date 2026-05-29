import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { requestPasswordReset } from '@/lib/auth-actions';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  if (sent) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl">REVISÁ TU EMAIL</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Si esa cuenta existe, te enviamos un link para reiniciar tu contraseña.
            Revisá tu bandeja de entrada (y la carpeta de spam, por si acaso).
          </p>
        </div>
        <p className="text-sm">
          <Link href="/login" className="text-crown underline">
            Volver al login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">OLVIDÉ MI CONTRASEÑA</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ingresá tu email y te mandamos un link para poner una nueva.
        </p>
      </div>

      <ActionForm action={requestPasswordReset}>
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

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Enviando…">
          Enviar link
        </SubmitButton>
      </ActionForm>

      <p className="text-muted-foreground text-sm">
        <Link href="/login" className="text-crown underline">
          Volver al login
        </Link>
      </p>
    </div>
  );
}
