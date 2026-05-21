import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Form } from '@/components/forms/form';
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

      <Form action={signUp}>
        {({ isPending }) => (
          <>
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

            <Button type="submit" variant="crown" size="lg" disabled={isPending} className="w-full">
              {isPending ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </>
        )}
      </Form>
    </div>
  );
}
