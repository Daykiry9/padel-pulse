'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, type ReactNode } from 'react';
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
  const errorRef = useRef<HTMLDivElement>(null);

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

  // Cuando aparece un error, lo traemos al viewport y le damos foco accesible.
  // Crítico en mobile/Android WebView donde el error inline al final del form
  // queda fuera de pantalla tras el tap en "Guardar" y el user cree que "no pasó nada".
  useEffect(() => {
    if (!state.ok && state.error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className={cn('space-y-4', className)}>
      {!state.ok && state.error && (
        <div
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm outline-none"
        >
          {state.error}
        </div>
      )}
      {children}
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
