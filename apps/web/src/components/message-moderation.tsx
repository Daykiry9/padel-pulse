'use client';

import { useState, useTransition } from 'react';
import { Ban, Check, Flag, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_REASONS, blockUser, reportContent } from '@/lib/moderation-actions';

/**
 * Reportar contenido y bloquear al autor.
 *
 * Existe porque la guideline 1.2 de Apple lo exige en apps con contenido de
 * usuarios (y Google Play tiene la politica equivalente). Panel inline en vez
 * de modal: el chat vive en una Card de altura fija y un dialog encima tapaba
 * la conversacion.
 */
export function MessageModeration({
  messageId,
  authorId,
  authorName,
  onBlocked,
}: {
  messageId: string;
  authorId: string;
  authorName: string;
  /** El padre esconde los mensajes del bloqueado sin esperar al refetch. */
  onBlocked: (authorId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [done, setDone] = useState<'reported' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitReport() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('target_kind', 'chat_message');
      fd.set('target_id', messageId);
      fd.set('reported_profile_id', authorId);
      fd.set('reason', reason);
      fd.set('note', note);
      const r = await reportContent(fd);
      if (r.ok) {
        setDone('reported');
        setNote('');
      } else {
        setError(r.error ?? 'Error');
      }
    });
  }

  function submitBlock() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('blocked_id', authorId);
      const r = await blockUser(fd);
      if (r.ok) {
        setOpen(false);
        onBlocked(authorId);
      } else {
        setError(r.error ?? 'Error');
      }
    });
  }

  if (!open) {
    // Antes era solo la bandera de 12px en text-muted-foreground/50: sobre el
    // fondo negro quedaba invisible. Tres testers seguidos no la encontraron y
    // el revisor de Apple tampoco iba a poder — que es justo el hallazgo que
    // busca la guideline 1.2 ("no pudimos ubicar el mecanismo de reporte").
    // Lleva la palabra al lado y contraste pleno; el min-h-11 mantiene el hit
    // target de 44px.
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Reportar o bloquear a ${authorName}`}
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-[11px] uppercase tracking-wider transition-colors"
      >
        <Flag className="size-3" />
        Reportar
      </button>
    );
  }

  if (done === 'reported') {
    return (
      <div className="border-border/40 bg-card mt-1 rounded-lg border p-3 text-xs">
        <p className="text-success flex items-center gap-1.5">
          <Check className="size-3.5" />
          Reporte enviado. Lo vamos a revisar.
        </p>
        <button
          type="button"
          onClick={submitBlock}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
        >
          También bloquear a {authorName}
        </button>
      </div>
    );
  }

  return (
    <div className="border-border/40 bg-card mt-1 w-full rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-xs tracking-tight">REPORTAR MENSAJE</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 flex size-8 items-center justify-center"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <Select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-2"
        placeholder="Motivo"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Detalle opcional…"
        maxLength={500}
        className="mt-2 min-h-[64px] text-xs"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="crown" onClick={submitReport} disabled={isPending}>
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <Flag className="size-3" />}
          Reportar
        </Button>
        <Button size="sm" variant="outline" onClick={submitBlock} disabled={isPending}>
          <Ban className="size-3" />
          Bloquear
        </Button>
      </div>

      <p className="text-muted-foreground mt-2 text-[10px] leading-snug">
        Bloquear oculta todos los mensajes de {authorName} para ti.
      </p>
      {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
    </div>
  );
}
