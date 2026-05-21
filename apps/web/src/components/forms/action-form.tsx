'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionResult } from '@/lib/auth-actions';

interface ActionFormProps {
  action: (formData: FormData) => Promise<ActionResult>;
  className?: string;
  children: ReactNode;
  onSuccess?: () => void;
}

const INITIAL: ActionResult = { ok: true };

export function ActionForm({ action, className, children, onSuccess }: ActionFormProps) {
  const router = useRouter();

  const [state, formAction] = useActionState(
    async (_prev: ActionResult, formData: FormData) => action(formData),
    INITIAL,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      onSuccess?.();
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router, onSuccess]);

  return (
    <form action={formAction} className={cn('space-y-4', className)}>
      {children}
      {!state.ok && state.error && <p className="text-destructive text-sm">{state.error}</p>}
    </form>
  );
}

interface SubmitProps extends Omit<ButtonProps, 'type'> {
  pendingLabel?: string;
}

export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? (pendingLabel ?? 'Procesando…') : children}
    </Button>
  );
}
