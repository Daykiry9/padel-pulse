'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionResult } from '@/lib/auth-actions';
import * as haptics from '@/lib/haptics';

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
      // Si el destino renderiza su propio banner de éxito (?saved=1), el toast
      // sería una doble señal para el mismo evento.
      if (!state.redirectTo.includes('saved=1')) toast.success('Listo');
      void haptics.success();
      onSuccess?.();
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router, onSuccess]);

  // Cuando aparece un error, lo traemos al viewport y le damos foco accesible.
  // Crítico en mobile/Android WebView donde el error inline al final del form
  // queda fuera de pantalla tras el tap en "Guardar" y el user cree que "no pasó nada".
  useEffect(() => {
    if (!state.ok && state.error) {
      void haptics.error();
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorRef.current.focus();
      }
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
          className="border-destructive/40 bg-destructive/10 text-destructive animate-in fade-in-0 slide-in-from-top-1 rounded-md border px-3 py-2 text-sm outline-none duration-200"
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
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel ?? 'Procesando…'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
