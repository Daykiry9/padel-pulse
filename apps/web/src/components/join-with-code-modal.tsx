'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CODE_RE = /^[a-z0-9]{4,}$/i;

interface JoinWithCodeModalProps {
  /** Trigger button/link that opens the modal. */
  trigger: ReactNode;
}

export function JoinWithCodeModal({ trigger }: JoinWithCodeModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = code.trim();
    if (!CODE_RE.test(value)) {
      setError('Mínimo 4 caracteres alfanuméricos');
      return;
    }
    setError(null);
    startTransition(() => {
      router.push(`/i/${value}`);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="border-border bg-card text-foreground fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-xl tracking-tight">
                Unirme con código
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                Pega el código de invitación que te compartieron por WhatsApp.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Cerrar"
                className="hover:bg-muted text-muted-foreground rounded-md p-1 transition-colors"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="invite-code"
                className="text-muted-foreground block text-[10px] uppercase tracking-widest"
              >
                Código
              </label>
              <Input
                id="invite-code"
                autoFocus
                autoComplete="off"
                inputMode="text"
                placeholder="abcd1234"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'invite-code-error' : undefined}
                className="font-mono tracking-wider"
              />
              {error && (
                <p
                  id="invite-code-error"
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                variant="crown"
                disabled={pending || !code.trim()}
              >
                {pending ? 'Abriendo…' : 'Continuar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
