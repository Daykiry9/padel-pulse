'use client';

import Link from 'next/link';
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
import { ExternalLink, LogOut, Settings, Trash2 } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { signOut } from '@/lib/auth-actions';

export function UserMenu({
  userId,
  displayName,
  city,
}: {
  userId: string;
  displayName: string;
  city: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menú de usuario"
          className="hover:ring-foreground/20 focus-visible:ring-ring rounded-full p-1 transition-shadow hover:ring-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar seed={userId} name={displayName} size="default" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-border bg-card text-foreground shadow-elevated animate-in fade-in-0 zoom-in-95 z-50 w-60 origin-top-right overflow-hidden rounded-xl border p-1 duration-[180ms]"
      >
        <DropdownMenuLabel className="px-3 py-2.5">
          <div className="text-sm font-semibold">{displayName}</div>
          {city && (
            <div className="text-muted-foreground mt-0.5 text-xs">{city}</div>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border/40 -mx-1 my-1 h-px" />

        {/* Los iconos estaban cruzados: el engranaje colgaba de "Ver mi perfil
            público" y el de usuario de la pantalla de ajustes. Dos testers
            buscando borrar su cuenta se fueron al perfil público, que no tiene
            esa opción. Ahora el engranaje va con la cuenta, el de enlace
            externo con la página pública, y la etiqueta dice "cuenta y datos"
            para que no compita con "perfil público". */}
        <DropdownMenuItem asChild>
          <Link
            href="/app/profile"
            className="hover:bg-muted focus:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none"
          >
            <Settings className="size-3.5" />
            Mi cuenta y datos
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/players/${userId}`}
            className="hover:bg-muted focus:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none"
          >
            <ExternalLink className="size-3.5" />
            Ver mi perfil público
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/40 -mx-1 my-1 h-px" />

        {/* Enlace directo al borrado de cuenta. Vivía solo al final del
            formulario de perfil, diez campos abajo, y tres testers seguidos no
            lo encontraron. La guideline 5.1.1(v) de Apple pide que el borrado
            sea fácilmente accesible, y "bajar hasta el fondo de otra pantalla"
            no lo es. */}
        <DropdownMenuItem asChild>
          <Link
            href="/app/profile#eliminar-cuenta"
            className="hover:bg-muted focus:bg-muted text-muted-foreground flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none"
          >
            <Trash2 className="size-3.5" />
            Eliminar mi cuenta
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/40 -mx-1 my-1 h-px" />

        <DropdownMenuItem asChild>
          <button
            onClick={handleSignOut}
            disabled={pending}
            className="hover:bg-destructive/10 focus:bg-destructive/10 text-destructive flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none disabled:opacity-60"
          >
            <LogOut className="size-3.5" />
            {pending ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
