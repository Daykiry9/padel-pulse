'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createInvitation } from '@/lib/invitation-actions';

type Kind = 'tournament' | 'team' | 'community';

const LABELS: Record<Kind, { title: string; body: string }> = {
  tournament: {
    title: 'Compartir torneo',
    body: 'Comparte este link. Quien lo abra puede registrarse a PadelKing y entrar a inscribirse al torneo.',
  },
  team: {
    title: 'Invitar al equipo',
    body: 'Comparte este link con tu compañero/a. Al abrirlo entra automáticamente al equipo.',
  },
  community: {
    title: 'Invitar a la comunidad',
    body: 'Comparte este link. Quien lo abra se une a la comunidad como miembro.',
  },
};

export function ShareInviteButton({
  kind,
  targetId,
  variant = 'outline',
  size = 'sm',
  label,
}: {
  kind: Kind;
  targetId: string;
  variant?: 'outline' | 'crown' | 'ghost' | 'default' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('kind', kind);
    fd.set('target_id', targetId);
    const result = await createInvitation(fd);
    setBusy(false);
    if (!result.ok || !result.code) {
      setError(result.error ?? 'Error generando invitación');
      return;
    }
    const origin = window.location.origin;
    setUrl(`${origin}/i/${result.code}`);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No pudimos copiar al portapapeles');
    }
  }

  async function shareNative() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: LABELS[kind].title,
          url,
        });
      } catch {
        // user canceled, ignore
      }
    } else {
      await copy();
    }
  }

  if (!open) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setOpen(true);
          if (!url) generate();
        }}
      >
        <Share2 className="size-3" />
        {label ?? 'Compartir'}
      </Button>
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <div className="font-display text-sm tracking-tight">{LABELS[kind].title.toUpperCase()}</div>
        <p className="text-muted-foreground mt-1 text-xs normal-case">{LABELS[kind].body}</p>
      </div>

      {busy && <p className="text-muted-foreground text-xs">Generando link…</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}

      {url && (
        <div className="space-y-2">
          <div className="bg-muted/40 border-border/40 break-all rounded-md border p-2 font-mono text-xs">
            {url}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="crown" onClick={shareNative}>
              <Share2 className="size-3" />
              Compartir
            </Button>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <p className="text-muted-foreground text-[10px]">El link expira en 30 días.</p>
        </div>
      )}
    </Card>
  );
}
