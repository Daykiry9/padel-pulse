'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Input de contraseña con toggle de ver/ocultar.
 *
 * Existe por evidencia, no por gusto: grabando los videos que pidió Apple, tres
 * testers seguidos fallaron el login entre cuatro y seis veces cada uno contra
 * "Email o contraseña incorrectos". Las credenciales estaban bien — el problema
 * era escribir una clave larga a ciegas en un teclado de teléfono.
 *
 * Envuelve `Input` en vez de reimplementarlo para que el borde, el focus ring y
 * la altura sigan siendo los mismos del resto de los formularios.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        // Espacio para que el texto no pase por debajo del botón.
        className={cn('pr-12', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        // El input mide 44px de alto, así que el botón lo llena completo y el
        // hit target queda en 44x44 sin agregar altura.
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-lg transition-colors focus-visible:outline-none focus-visible:ring-2"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
