'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Crown } from 'lucide-react';

type Brand = 'kings' | 'queens';

function setBrandCookie(brand: Brand) {
  // 1 año, path /, sameSite Lax para navegación normal
  document.cookie = `pk_brand=${brand}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
}

export function BrandSwitcher({ current }: { current: Brand }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Brand>(current);

  function switchTo(target: Brand) {
    if (target === optimistic) return;
    setOptimistic(target);
    setBrandCookie(target);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="tablist"
      aria-label="Cambiar entre PadelKing y PadelQueens"
      className="border-border bg-card/60 inline-flex items-center rounded-full border p-0.5 backdrop-blur"
    >
      <button
        role="tab"
        aria-selected={optimistic === 'kings'}
        onClick={() => switchTo('kings')}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
          optimistic === 'kings'
            ? 'bg-gold-400 text-gold-900'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Crown className="size-2.5" />
        Kings
      </button>
      <button
        role="tab"
        aria-selected={optimistic === 'queens'}
        onClick={() => switchTo('queens')}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
          optimistic === 'queens'
            ? 'bg-magenta-500 text-magenta-900'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Crown className="size-2.5" />
        Queens
      </button>
    </div>
  );
}
