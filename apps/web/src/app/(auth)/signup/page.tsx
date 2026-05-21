import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { signUp } from '@/lib/auth-actions';

export default function SignupPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">CREAR CUENTA</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-crown underline">
            Ingresa aquí
          </Link>
          .
        </p>
      </div>

      <ActionForm action={signUp}>
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
      </ActionForm>
    </div>
  );
}
