'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import * as haptics from '@/lib/haptics';

/**
 * Tabs del bottom nav en el orden visible. El swipe horizontal navega entre
 * estas rutas (deslizar a la izquierda → ir al siguiente tab; deslizar a la
 * derecha → ir al anterior). Solo se activa cuando el pathname matchea uno
 * de estos tabs exactamente (no en rutas anidadas tipo /app/communities/[slug]).
 */
const TABS = ['/app', '/app/communities', '/app/tournaments', '/app/profile'] as const;

/** Threshold: distancia horizontal mínima + ratio horizontal:vertical para
 *  considerar swipe deliberado y NO interferir con scroll vertical normal. */
const MIN_DISTANCE = 70; // px
const HORIZONTAL_RATIO = 1.5; // |dx| > 1.5*|dy|
const MAX_VERTICAL = 60; // si el dedo se mueve mucho verticalmente, NO es swipe lateral

/**
 * Listener global de gestos de swipe para navegar entre tabs de /app/*.
 * No renderiza nada — solo escucha touchstart/touchmove/touchend en el body.
 * Respeta scroll vertical: si el primer movimiento es claramente vertical,
 * cancela el swipe detection.
 */
export function SwipeTabsListener() {
  const router = useRouter();
  const pathname = usePathname();

  // Refs para no re-suscribir el listener cuando pathname cambia.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let active = false; // se vuelve true tras el primer touchmove con dirección horizontal
    let cancelled = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0]!;
      startX = t.clientX;
      startY = t.clientY;
      startedAt = performance.now();
      active = false;
      cancelled = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (cancelled || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Primer threshold: si el dedo se movió >12px, decidir si es horizontal o vertical.
      const dist = Math.hypot(dx, dy);
      if (!active && dist > 12) {
        if (Math.abs(dy) > Math.abs(dx)) {
          cancelled = true; // vertical → es scroll, dejar pasar
          return;
        }
        active = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (cancelled || !active) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = performance.now() - startedAt;

      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dy) > MAX_VERTICAL) return;
      if (Math.abs(dx) < HORIZONTAL_RATIO * Math.abs(dy)) return;
      if (dt > 700) return; // muy lento → no era swipe

      // Solo cambiar de tab si estamos en uno de los tabs exactos.
      const idx = TABS.indexOf(pathnameRef.current as (typeof TABS)[number]);
      if (idx === -1) return;

      let nextIdx: number;
      if (dx < 0) nextIdx = idx + 1; // swipe a la izquierda → siguiente tab
      else nextIdx = idx - 1; // swipe a la derecha → anterior

      if (nextIdx < 0 || nextIdx >= TABS.length) return;

      void haptics.tap();
      router.push(TABS[nextIdx]!);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [router]);

  return null;
}
