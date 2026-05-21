'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionResult } from '@/lib/auth-actions';

interface FormProps {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  children: ReactNode;
  onSuccess?: () => void;
}

export function Form({ action, className, children, onSuccess }: FormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);
    startTransition(async () => {
      const res = await action(formData);
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido');
        return;
      }
      onSuccess?.();
      if (res.redirectTo) router.push(res.redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}

interface SubmitProps extends Omit<ButtonProps, 'type'> {
  pendingLabel?: string;
}

/**
 * Botón submit que muestra estado pending automáticamente.
 * Usar dentro de <Form>.
 */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? (pendingLabel ?? 'Procesando…') : children}
    </Button>
  );
}
