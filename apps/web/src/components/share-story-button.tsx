'use client';

import { useState } from 'react';
import { Download, ImageDown, Loader2, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function ShareStoryButton({
  slug,
  tournamentName,
  variant = 'outline',
  size = 'sm',
}: {
  slug: string;
  tournamentName: string;
  variant?: 'outline' | 'crown' | 'queens' | 'ghost' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'xl';
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = `/api/share/tournament/${slug}`;

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('No se generó la imagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padelking-${slug}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando imagen');
    } finally {
      setBusy(false);
    }
  }

  async function shareNative() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('No se generó la imagen');
      const blob = await res.blob();
      const file = new File([blob], `padelking-${slug}.png`, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Torneo en PadelKing`,
          text: `${tournamentName} en PadelKing`,
        });
      } else {
        // Fallback a download si Web Share no soporta archivos
        download();
      }
    } catch (e) {
      // user canceled — silent
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'Error compartiendo');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <ImageDown className="size-3" />
        Compartir story
      </Button>
    );
  }

  return (
    <Card className="animate-in fade-in-0 zoom-in-95 origin-top space-y-3 p-4 duration-200">
      <div>
        <div className="font-display text-sm tracking-tight">COMPARTIR STORY</div>
        <p className="text-muted-foreground mt-1 text-xs normal-case">
          Genera una imagen 1080×1920 lista para Instagram Stories con el torneo, fecha, sede y
          link de inscripción.
        </p>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="crown" onClick={shareNative} disabled={busy}>
          {busy ? <Loader2 className="size-3 animate-spin" /> : <Share2 className="size-3" />}
          {busy ? 'Generando…' : 'Compartir'}
        </Button>
        <Button size="sm" variant="outline" onClick={download} disabled={busy}>
          <Download className="size-3" />
          Descargar PNG
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>

      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground text-[10px] uppercase tracking-widest underline-offset-2 hover:underline"
      >
        Ver imagen completa →
      </a>
    </Card>
  );
}
