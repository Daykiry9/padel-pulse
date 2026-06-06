'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Custom Select drop-in: API igual al native <select> (value, onChange, name,
// children con <option>) pero render con popup estilizado. Mantiene un
// <input type="hidden" name=...> debajo para que ActionForm/FormData lo
// recoja exactamente igual que un select real.
//
// Por qué no native: en WebView Android el dropdown nativo se ve horrible
// (pantalla blanca tipo dialog system) y no respeta el theme dark.

type OptionLike = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

interface SelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  children: React.ReactNode;
}

function extractOptions(children: React.ReactNode): OptionLike[] {
  const out: OptionLike[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === 'option') {
      const p = child.props as {
        value?: string;
        children?: React.ReactNode;
        disabled?: boolean;
      };
      // Skipear option de placeholder sin value real.
      if (p.value === undefined) return;
      out.push({
        value: String(p.value),
        label: p.children ?? p.value,
        disabled: p.disabled,
      });
    }
  });
  return out;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      name,
      value,
      defaultValue,
      required,
      disabled,
      className,
      placeholder = 'Selecciona…',
      onChange,
      children,
    },
    ref,
  ) => {
    const options = React.useMemo(() => extractOptions(children), [children]);
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState(defaultValue ?? '');
    const current = isControlled ? value : internal;

    const [open, setOpen] = React.useState(false);
    const [activeIdx, setActiveIdx] = React.useState(0);
    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    const popupRef = React.useRef<HTMLDivElement | null>(null);
    const listRef = React.useRef<HTMLUListElement | null>(null);

    React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

    const selected = options.find((o) => o.value === current) ?? null;

    // Cerrar al click fuera + esc.
    React.useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent | TouchEvent) => {
        const t = e.target as Node;
        if (
          popupRef.current?.contains(t) ||
          triggerRef.current?.contains(t)
        )
          return;
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          triggerRef.current?.focus();
        }
      };
      document.addEventListener('mousedown', onDown);
      document.addEventListener('touchstart', onDown);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDown);
        document.removeEventListener('touchstart', onDown);
        document.removeEventListener('keydown', onKey);
      };
    }, [open]);

    // Cuando abre, alinear activeIdx al seleccionado y scrollear a él.
    React.useEffect(() => {
      if (!open) return;
      const i = options.findIndex((o) => o.value === current);
      setActiveIdx(i >= 0 ? i : 0);
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]')[
          i >= 0 ? i : 0
        ];
        el?.scrollIntoView({ block: 'nearest' });
      });
    }, [open, options, current]);

    function commit(val: string) {
      if (!isControlled) setInternal(val);
      onChange?.({ target: { value: val, name } });
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }

    function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
      if (disabled) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
    }

    function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => {
          let n = i;
          for (let k = 0; k < options.length; k++) {
            n = (n + 1) % options.length;
            if (!options[n]?.disabled) return n;
          }
          return i;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => {
          let n = i;
          for (let k = 0; k < options.length; k++) {
            n = (n - 1 + options.length) % options.length;
            if (!options[n]?.disabled) return n;
          }
          return i;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[activeIdx];
        if (opt && !opt.disabled) commit(opt.value);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const first = options.findIndex((o) => !o.disabled);
        if (first >= 0) setActiveIdx(first);
      } else if (e.key === 'End') {
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i]?.disabled) {
            setActiveIdx(i);
            break;
          }
        }
      }
    }

    return (
      <div className={cn('relative w-full', className)}>
        {/* Hidden input para FormData — equivalente al native select. */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={current}
            // required no aplica a hidden; lo validamos vía pattern en el trigger.
          />
        )}

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required}
          data-placeholder={!selected}
          className={cn(
            'border-input bg-card text-foreground flex h-11 w-full items-center justify-between rounded-lg border px-3.5 py-2 text-left text-sm',
            'transition-[border-color,box-shadow] duration-[120ms] [transition-timing-function:var(--ease-out)]',
            'hover:border-foreground/15',
            'focus-visible:ring-ring/60 focus-visible:border-ring/40 focus-visible:outline-none focus-visible:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[placeholder=true]:text-muted-foreground',
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown
            className={cn(
              'text-crown ml-2 size-4 shrink-0 transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div
            ref={popupRef}
            className={cn(
              'bg-popover text-popover-foreground border-border absolute left-0 right-0 top-full z-50 mt-1.5',
              'animate-in fade-in-0 zoom-in-95 origin-top rounded-lg border shadow-xl',
              'overflow-hidden',
            )}
          >
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              aria-activedescendant={`opt-${activeIdx}`}
              onKeyDown={onListKey}
              className="max-h-72 overflow-y-auto py-1 outline-none"
              autoFocus
            >
              {options.map((opt, i) => {
                const isSel = opt.value === current;
                const isActive = i === activeIdx;
                return (
                  <li
                    key={opt.value}
                    id={`opt-${i}`}
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={opt.disabled}
                    onMouseEnter={() => !opt.disabled && setActiveIdx(i)}
                    onClick={() => !opt.disabled && commit(opt.value)}
                    className={cn(
                      'mx-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm leading-snug',
                      'transition-colors duration-100',
                      isActive && !opt.disabled && 'bg-muted',
                      isSel && 'text-crown',
                      opt.disabled && 'text-muted-foreground/50 pointer-events-none',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSel && <Check className="size-4 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
