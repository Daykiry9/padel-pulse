'use client';

import { useCallback, useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { KingLogo } from '@/components/marketing/king-logo';

/** El evento no está en lib.dom todavía. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'pk_install_dismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari no soporta display-mode y expone esto en su lugar.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Registra el service worker y ofrece instalar la app.
 *
 * En Android el navegador emite beforeinstallprompt y podemos instalar de
 * verdad. iOS no tiene esa API, asi que ahi solo se explica el gesto manual.
 * No se monta en el wrapper nativo: ahi ya *es* la app.
 */
export function PwaInstall({ isNative }: { isNative: boolean }) {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isNative) return;

    // SW solo de red (public/sw.js). Habilita instalar sin cachear nada.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Si falla, la app sigue funcionando: solo se pierde el prompt.
      });
    }

    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS nunca dispara el evento: se ofrece la instruccion manual.
    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [isNative]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDeferred(null);
    setShowIosHint(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, '1');
    setDeferred(null);
  }, [deferred]);

  if (isNative || (!deferred && !showIosHint)) return null;

  return (
    <div
      className="border-border/40 bg-background/95 fixed inset-x-0 z-40 border-t backdrop-blur-xl md:hidden"
      // Se apoya encima del MobileNav, que mide 4rem + safe-area.
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <KingLogo size={36} />

        <div className="min-w-0 flex-1">
          <p className="font-display text-sm tracking-tight">INSTALA PADELKING</p>
          {showIosHint ? (
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
              Toca <Share className="inline size-3" /> y luego «Añadir a inicio»
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Acceso directo, sin pasar por el navegador.
            </p>
          )}
        </div>

        {deferred && (
          <Button variant="crown" size="sm" onClick={install}>
            Instalar
          </Button>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground -mr-1 flex size-11 shrink-0 items-center justify-center transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
