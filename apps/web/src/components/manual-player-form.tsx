'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { UserPlus, Search, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { addManualPlayer } from '@/lib/tournament-actions';
import { cn } from '@/lib/utils';

type SlotKind = 'guest' | 'profile';

type ProfileSearchResult = {
  id: string;
  display_name: string;
  skill_category: string | null;
};

type SlotValue =
  | { kind: 'guest'; name: string }
  | { kind: 'profile'; profile: ProfileSearchResult | null };

const EMPTY_SLOT: SlotValue = { kind: 'guest', name: '' };

interface ManualPlayerFormProps {
  tournamentId: string;
  /** true = torneo de parejas (americano fijo, liga, liguilla, eliminación): pide 2 jugadores. */
  pairMode?: boolean;
  className?: string;
}

/**
 * Formulario del organizador para inscribir gente manualmente.
 *
 * - Individual (pairMode=false): un jugador, cuenta existente o invitado.
 * - Pareja (pairMode=true): dos jugadores, cada uno cuenta o invitado, en una
 *   sola inscripción. Deja que una persona arme un cuadro de parejas con
 *   invitados sin que nadie tenga cuenta.
 *
 * Llama al server action `addManualPlayer` y refresca al ok.
 */
export function ManualPlayerForm({ tournamentId, pairMode = false, className }: ManualPlayerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slotOne, setSlotOne] = useState<SlotValue>(EMPTY_SLOT);
  const [slotTwo, setSlotTwo] = useState<SlotValue>(EMPTY_SLOT);

  function reset() {
    setSlotOne(EMPTY_SLOT);
    setSlotTwo(EMPTY_SLOT);
    setError(null);
  }

  function slotIsEmpty(s: SlotValue): boolean {
    return s.kind === 'guest' ? s.name.trim().length < 2 : !s.profile;
  }

  function appendSlot(fd: FormData, s: SlotValue, suffix: string) {
    if (s.kind === 'guest') fd.set(`guest_name${suffix}`, s.name.trim());
    else if (s.profile) fd.set(`profile_id${suffix}`, s.profile.id);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (slotIsEmpty(slotOne)) {
      setError(pairMode ? 'Completa al Jugador 1' : 'Completa al jugador');
      return;
    }
    if (pairMode && slotIsEmpty(slotTwo)) {
      setError('Completa al Jugador 2');
      return;
    }

    const fd = new FormData();
    fd.set('tournament_id', tournamentId);
    fd.set('mode', pairMode ? 'pair' : 'single');
    appendSlot(fd, slotOne, '_one');
    if (pairMode) appendSlot(fd, slotTwo, '_two');

    startTransition(async () => {
      const r = await addManualPlayer(fd);
      if (!r.ok) {
        setError(r.error ?? 'No pudimos completar la inscripción');
        return;
      }
      reset();
      router.refresh();
    });
  }

  const canSubmit =
    !isPending && !slotIsEmpty(slotOne) && (!pairMode || !slotIsEmpty(slotTwo));

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="text-crown size-4" />
          {pairMode ? 'Agregar pareja' : 'Agregar jugador'}
        </CardTitle>
        <CardDescription>
          {pairMode
            ? 'Inscribe una pareja completa. Cada jugador puede ser una cuenta o un invitado sin cuenta.'
            : 'Suma una cuenta existente o un invitado sin cuenta. Los invitados viven solo en este torneo.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <PlayerSlot
            label={pairMode ? 'Jugador 1' : undefined}
            value={slotOne}
            onChange={setSlotOne}
            disabled={isPending}
          />
          {pairMode && (
            <PlayerSlot
              label="Jugador 2"
              value={slotTwo}
              onChange={setSlotTwo}
              disabled={isPending}
            />
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
            <Button type="submit" variant="crown" size="sm" disabled={!canSubmit}>
              {isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Agregando…
                </>
              ) : (
                <>
                  <UserPlus className="size-3" />
                  {pairMode ? 'Agregar pareja' : 'Agregar al torneo'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Slot de un jugador: toggle invitado / cuenta existente, con autocomplete de
 * perfiles cuando es cuenta. El valor lo controla el padre; la búsqueda
 * (query/resultados) es estado interno del slot.
 */
function PlayerSlot({
  label,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  value: SlotValue;
  onChange: (v: SlotValue) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const kind = value.kind;
  const selected = value.kind === 'profile' ? value.profile : null;

  function switchKind(next: SlotKind) {
    if (next === kind) return;
    setQuery('');
    setResults([]);
    onChange(next === 'guest' ? { kind: 'guest', name: '' } : { kind: 'profile', profile: null });
  }

  // Debounce search (solo en modo cuenta y sin selección)
  useEffect(() => {
    if (kind !== 'profile' || selected) return;
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
  }, [query, kind, selected]);

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-muted-foreground text-[10px] uppercase tracking-widest">{label}</div>
      )}

      <div
        role="tablist"
        aria-label="Tipo de jugador"
        className="bg-muted/40 border-border inline-flex w-full rounded-lg border p-1"
      >
        <ModeTab active={kind === 'guest'} onClick={() => switchKind('guest')}>
          Invitado
        </ModeTab>
        <ModeTab active={kind === 'profile'} onClick={() => switchKind('profile')}>
          Cuenta existente
        </ModeTab>
      </div>

      {kind === 'guest' ? (
        <Input
          value={value.kind === 'guest' ? value.name : ''}
          onChange={(e) => onChange({ kind: 'guest', name: e.target.value })}
          placeholder="Ej. Juan Pérez"
          maxLength={60}
          disabled={disabled}
          autoComplete="off"
          aria-label={label ? `Nombre de ${label}` : 'Nombre del invitado'}
        />
      ) : selected ? (
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
              onChange({ kind: 'profile', profile: null });
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre del jugador"
            className="pl-9"
            disabled={disabled}
            autoComplete="off"
            aria-label={label ? `Buscar cuenta para ${label}` : 'Buscar cuenta'}
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
                      onChange({ kind: 'profile', profile: p });
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
            <p className="text-muted-foreground mt-2 text-xs">Sin resultados para “{query.trim()}”.</p>
          ) : null}
        </div>
      )}
    </div>
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
