'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { cn } from '@/lib/utils';

export interface TabDef {
  key: string;
  label: string;
}

export function TabsNav({
  tabs,
  basePath,
  defaultTab = 'ranking',
}: {
  tabs: TabDef[];
  basePath: string;
  defaultTab?: string;
}) {
  const searchParams = useSearchParams();
  const current = searchParams.get('tab') ?? defaultTab;

  return (
    <nav
      role="tablist"
      aria-label="Secciones de la comunidad"
      className="border-border/40 bg-background/80 sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border md:px-2"
    >
      {tabs.map((t) => {
        const active = current === t.key;
        return (
          <Link
            key={t.key}
            role="tab"
            aria-selected={active}
            href={`${basePath}?tab=${t.key}`}
            scroll={false}
            className={cn(
              'font-display whitespace-nowrap rounded-md px-3 py-1.5 text-xs uppercase tracking-widest transition-colors',
              active
                ? 'bg-crown/10 text-crown'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
