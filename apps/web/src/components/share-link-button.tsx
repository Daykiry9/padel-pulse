'use client';

import { Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Comparte la URL actual con el share sheet nativo (movil / app) y cae a
 * WhatsApp web cuando el navegador no lo soporta (desktop).
 */
export function ShareLinkButton({ text, label = 'Compartir' }: { text: string; label?: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // cancelado por el usuario
      }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <Button variant="crown" size="lg" className="w-full" onClick={share}>
      <Share2 className="size-4" />
      {label}
    </Button>
  );
}
