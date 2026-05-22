'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { Crown, Globe, Search, Trophy, User } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import type { SearchResult } from '@/app/api/search/route';

const KIND_ICONS = {
  tournament: Trophy,
  community: Globe,
  player: User,
} as const;

const KIND_LABELS = {
  tournament: 'Torneos',
  community: 'Comunidades',
  player: 'Jugadores',
} as const;

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const onSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  // Group results by kind
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.kind] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buscar (Ctrl+K)"
        className="border-border bg-card/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors"
      >
        <Search className="size-3" />
        <span className="hidden sm:inline">Buscar…</span>
        <kbd className="border-border bg-muted ml-1 hidden rounded-sm border px-1.5 py-0.5 font-mono text-[9px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="border-border bg-card text-foreground shadow-elevated w-[90vw] max-w-xl overflow-hidden rounded-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <Command shouldFilter={false} loop>
              <div className="border-border/40 flex items-center gap-3 border-b px-4">
                <Search className="text-muted-foreground size-4" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Busca torneos, comunidades, jugadores…"
                  autoFocus
                  className="placeholder:text-muted-foreground flex-1 bg-transparent py-4 text-sm outline-none"
                />
                <kbd className="border-border bg-muted hidden rounded-sm border px-1.5 py-0.5 font-mono text-[9px] sm:inline">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                {loading && (
                  <div className="text-muted-foreground py-6 text-center text-xs">
                    Buscando…
                  </div>
                )}

                {!loading && query.trim().length < 2 && (
                  <div className="text-muted-foreground py-8 text-center text-xs">
                    Escribe al menos 2 letras para buscar.
                  </div>
                )}

                {!loading && query.trim().length >= 2 && results.length === 0 && (
                  <Command.Empty className="text-muted-foreground py-8 text-center text-sm">
                    Sin resultados para &ldquo;{query}&rdquo;.
                  </Command.Empty>
                )}

                {(['tournament', 'community', 'player'] as const).map((kind) => {
                  const items = grouped[kind];
                  if (!items || items.length === 0) return null;
                  const Icon = KIND_ICONS[kind];

                  return (
                    <Command.Group
                      key={kind}
                      heading={KIND_LABELS[kind]}
                      className="text-muted-foreground [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em]"
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={`${item.kind}-${item.id}`}
                          onSelect={() => onSelect(item.href)}
                          className="aria-selected:bg-muted aria-selected:text-foreground text-foreground/85 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none"
                        >
                          {kind === 'player' ? (
                            <Avatar seed={item.id} name={item.title} size="sm" />
                          ) : (
                            <div className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
                              <Icon className="size-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-muted-foreground truncate text-[10px] uppercase tracking-widest">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          {item.meta && (
                            <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">
                              {item.meta}
                            </span>
                          )}
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>

              <div className="border-border/40 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-[10px]">
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="border-border bg-muted rounded-sm border px-1 py-0.5 font-mono">↑↓</kbd>
                    navegar
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="border-border bg-muted rounded-sm border px-1 py-0.5 font-mono">↵</kbd>
                    abrir
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Crown className="text-crown size-2.5" />
                  PadelKing
                </span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
