'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/auth-actions';

interface FormProps {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  children: ReactNode | ((state: { isPending: boolean; error?: string }) => ReactNode);
  onSuccess?: () => void;
}

export function Form({ action, className, children, onSuccess }: FormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

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
      {typeof children === 'function' ? children({ isPending, error }) : children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </form>
  );
}
