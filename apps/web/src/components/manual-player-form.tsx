'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { UserPlus, Search, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { addManualPlayer } from '@/lib/tournament-actions';
import { cn } from '@/lib/utils';

type Mode = 'profile' | 'guest';

type ProfileSearchResult = {
  id: string;
  display_name: string;
  skill_category: string | null;
};

interface ManualPlayerFormProps {
  tournamentId: string;
  className?: string;
}

/**
 * Formulario del organizador para agregar jugadores manualmente al torneo.
 *
 * Dos modos:
 *  - 'profile' → busca un perfil existente por display_name (autocomplete).
 *  - 'guest'   → crea un invitado sin cuenta (solo nombre, vive en el torneo).
 *
 * Llama al server action `addManualPlayer` y refresca la página al ok.
 */
export function ManualPlayerForm({ tournamentId, className }: ManualPlayerFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('guest');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modo invitado
  const [guestName, setGuestName] = useState('');

  // Modo cuenta existente
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [selected, setSelected] = useState<ProfileSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce search
  useEffect(() => {
    if (mode !== 'profile') return;
    if (selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results?: ProfileSearchResult[] };
        setResults(data.results ?? []);
      } catch {
        // aborted o network — silencio
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, mode, selected]);

  function reset() {
    setGuestName('');
    setQuery('');
    setResults([]);
    setSelected(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    reset();
    setMode(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set('tournament_id', tournamentId);

    if (mode === 'guest') {
      const name = guestName.trim();
      if (name.length < 2) {
        setError('Escribe un nombre (mínimo 2 caracteres)');
        return;
      }
      fd.set('mode', 'guest');
      fd.set('display_name', name);
    } else {
      if (!selected) {
        setError('Elige una cuenta de la lista');
        return;
      }
      fd.set('mode', 'profile');
      fd.set('profile_id', selected.id);
    }

    startTransition(async () => {
      const r = await addManualPlayer(fd);
      if (!r.ok) {
        setError(r.error ?? 'No pudimos agregar al jugador');
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4 text-crown" />
          Agregar jugador
        </CardTitle>
        <CardDescription>
          Suma una cuenta existente o un invitado sin cuenta. Los invitados viven solo en este
          torneo.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs de modo */}
        <div
          role="tablist"
          aria-label="Tipo de jugador"
          className="bg-muted/40 border-border inline-flex w-full rounded-lg border p-1"
        >
          <ModeTab active={mode === 'guest'} onClick={() => switchMode('guest')}>
            Invitado
          </ModeTab>
          <ModeTab active={mode === 'profile'} onClick={() => switchMode('profile')}>
            Cuenta existente
          </ModeTab>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'guest' ? (
            <FormField
              label="Nombre del invitado"
              htmlFor="guest-name"
              hint="Aparecerá con la etiqueta INVITADO en el torneo."
            >
              <Input
                id="guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                maxLength={60}
                disabled={isPending}
                autoComplete="off"
              />
            </FormField>
          ) : (
            <FormField
              label="Buscar por nombre"
              htmlFor="profile-search"
              hint="El usuario tiene que existir en PadelKing."
            >
              {selected ? (
                <div className="border-border bg-card flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-foreground truncate text-sm font-medium">
                      {selected.display_name}
                    </div>
                    {selected.skill_category ? (
                      <div className="text-muted-foreground text-[11px] uppercase tracking-widest">
                        {selected.skill_category}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setQuery('');
                    }}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition-colors"
                    aria-label="Quitar selección"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="profile-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del jugador"
                    className="pl-9"
                    disabled={isPending}
                    autoComplete="off"
                  />
                  {searching ? (
                    <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
                  ) : null}

                  {results.length > 0 ? (
                    <ul
                      role="listbox"
                      className="border-border bg-card shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] animate-in fade-in-0 zoom-in-95 absolute z-10 mt-1.5 max-h-60 w-full origin-top overflow-auto rounded-lg border py-1 duration-[180ms]"
                    >
                      {results.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(p);
                              setResults([]);
                            }}
                            className="hover:bg-muted focus-visible:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left outline-none transition-colors"
                          >
                            <span className="text-foreground truncate text-sm font-medium">
                              {p.display_name}
                            </span>
                            {p.skill_category ? (
                              <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-widest">
                                {p.skill_category}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : query.trim().length >= 2 && !searching ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Sin resultados para “{query.trim()}”.
                    </p>
                  ) : null}
                </div>
              )}
            </FormField>
          )}

          {error ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-xs"
            >
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="submit"
              variant="crown"
              size="sm"
              disabled={isPending || (mode === 'profile' && !selected)}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Agregando…
                </>
              ) : (
                <>
                  <UserPlus className="size-3" />
                  Agregar al torneo
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'relative flex-1 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
        'transition-[background-color,color] duration-[120ms] [transition-timing-function:var(--ease-out)]',
        active
          ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25)]'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
