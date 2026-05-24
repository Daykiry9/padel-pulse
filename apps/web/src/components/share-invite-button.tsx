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
    body: 'Comparte este link por WhatsApp. Quien lo abra puede registrarse a PadelKing y entrar a inscribirse al torneo.',
  },
  team: {
    title: 'Invitar al equipo',
    body: 'Comparte este link con tu compañero/a. Al abrirlo entra automáticamente al equipo.',
  },
  community: {
    title: 'Invitar a la comunidad',
    body: 'Comparte este link en tu grupo de WhatsApp. Cada quien que lo abre puede registrarse y pedir entrar a la comunidad.',
  },
};

function buildWhatsappMessage(kind: Kind, name: string | undefined, url: string): string {
  if (kind === 'tournament') {
    return `🎾 Inscríbete al torneo${name ? ` "${name}"` : ''} en PadelKing. Abre el link, regístrate (toma 1 min) y te metes:\n\n${url}`;
  }
  if (kind === 'team') {
    return `🎾 Te invito a mi equipo${name ? ` "${name}"` : ''} en PadelKing. Abre el link y entras automático:\n\n${url}`;
  }
  return `🎾 Únete a la comunidad${name ? ` "${name}"` : ''} en PadelKing. Abre el link, regístrate y pides entrar:\n\n${url}`;
}

function WhatsappIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

export function ShareInviteButton({
  kind,
  targetId,
  name,
  variant = 'outline',
  size = 'sm',
  label,
}: {
  kind: Kind;
  targetId: string;
  /** Nombre del torneo/equipo/comunidad — se incluye en el mensaje pre-formateado de WhatsApp */
  name?: string;
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

  function openWhatsapp() {
    if (!url) return;
    const message = buildWhatsappMessage(kind, name, url);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  async function shareNative() {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: LABELS[kind].title,
          text: buildWhatsappMessage(kind, name, url),
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
        <div className="font-display text-sm uppercase tracking-tight">{LABELS[kind].title}</div>
        <p className="text-muted-foreground mt-1 text-xs normal-case">{LABELS[kind].body}</p>
      </div>

      {busy && <p className="text-muted-foreground text-xs">Generando link…</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}

      {url && (
        <div className="space-y-2">
          {/* CTA principal: WhatsApp */}
          <button
            onClick={openWhatsapp}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-black transition-[transform,filter] hover:brightness-110 active:scale-[0.98]"
          >
            <WhatsappIcon className="size-4" />
            Compartir por WhatsApp
          </button>

          {/* Link + acciones secundarias */}
          <div className="bg-muted/40 border-border/40 break-all rounded-md border p-2 font-mono text-xs">
            {url}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
            <Button size="sm" variant="outline" onClick={shareNative}>
              <Share2 className="size-3" />
              Otra app
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
