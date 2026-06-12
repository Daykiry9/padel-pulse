'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Plus } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { setActiveCommunity } from '@/lib/community-actions';
import { cn } from '@/lib/utils';

export interface CommunitySwitcherCommunity {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

interface CommunitySwitcherProps {
  communities: CommunitySwitcherCommunity[];
  activeCommunityId: string | null;
}

export function CommunitySwitcher({ communities, activeCommunityId }: CommunitySwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (communities.length === 0) return null;

  const active =
    communities.find((c) => c.id === activeCommunityId) ?? communities[0]!;

  function handleSelect(communityId: string) {
    if (communityId === activeCommunityId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('community_id', communityId);
      const result = await setActiveCommunity(fd);
      setOpen(false);
      if (result.ok) router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Cambiar comunidad activa"
          disabled={pending}
          className="hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-[120ms] [transition-timing-function:var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:opacity-60"
        >
          <Avatar
            seed={active.id}
            name={active.name}
            src={active.logoUrl ?? null}
            size="default"
          />
          <span className="font-display max-w-[160px] truncate text-base tracking-tight">
            {active.name}
          </span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="border-border bg-card text-foreground shadow-elevated animate-in fade-in-0 zoom-in-95 z-50 w-64 origin-top overflow-hidden rounded-xl border p-1 duration-[180ms]"
      >
        <DropdownMenuLabel className="text-muted-foreground px-3 py-2 text-[10px] uppercase tracking-widest">
          Tus comunidades
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40 -mx-1 my-1 h-px" />
        {communities.map((c) => {
          const isActive = c.id === activeCommunityId;
          return (
            <DropdownMenuItem
              key={c.id}
              onSelect={(e) => {
                e.preventDefault();
                handleSelect(c.id);
              }}
              className={cn(
                'hover:bg-muted focus:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none',
                isActive && 'bg-muted/50',
              )}
            >
              <Avatar
                seed={c.id}
                name={c.name}
                src={c.logoUrl ?? null}
                size="sm"
              />
              <span className="font-display flex-1 truncate tracking-tight">{c.name}</span>
              {isActive && <Check className="text-crown size-3.5 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="bg-border/40 -mx-1 my-1 h-px" />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(false);
            router.push('/app/communities/new');
          }}
          className="hover:bg-muted focus:bg-muted text-crown flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none"
        >
          <span className="bg-crown/15 text-crown flex size-7 items-center justify-center rounded-full">
            <Plus className="size-3.5" />
          </span>
          <span className="font-display flex-1 tracking-tight">Crear comunidad</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(false);
            router.push('/app/communities');
          }}
          className="hover:bg-muted focus:bg-muted text-muted-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] uppercase tracking-widest outline-none"
        >
          Ver todas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
