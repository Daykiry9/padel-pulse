import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { getSession } from '@/lib/supabase/server';
import { updatePassword } from '@/lib/auth-actions';

export default async function ResetPasswordPage() {
  // Si la sesión fue establecida por el callback OAuth/recovery, podemos
  // cambiar la contraseña. Si no, el link estaba mal o expiró.
  const user = await getSession();

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl">LINK INVÁLIDO</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            El link expiró o ya se usó. Pedí uno nuevo y revisá tu email.
          </p>
        </div>
        <Link href="/forgot-password" className="text-crown underline text-sm">
          Pedir un link nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">NUEVA CONTRASEÑA</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Elige una contraseña nueva para tu cuenta.
        </p>
      </div>

      <ActionForm action={updatePassword}>
        <FormField label="Contraseña nueva" htmlFor="password" hint="Mínimo 8 caracteres">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </FormField>

        <SubmitButton variant="crown" size="lg" className="w-full" pendingLabel="Guardando…">
          Cambiar contraseña
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
