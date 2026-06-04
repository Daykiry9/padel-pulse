'use client';

import { useRef, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { uploadCommunityLogo, deleteCommunityLogo } from '@/lib/community-actions';
import { cn } from '@/lib/utils';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
// SVG fuera del whitelist por XSS — el bucket es público y un SVG puede ejecutar
// scripts si se navega a la URL directa.
const ACCEPTED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ACCEPT_ATTR = 'image/png,image/jpeg,image/webp';

interface CommunityLogoUploaderProps {
  communityId: string;
  currentLogoUrl: string | null;
  communityName: string;
  className?: string;
}

/**
 * Uploader del logo de comunidad. Validación de tipo/size client-side antes
 * de invocar el server action. Mantiene el preview optimista con el `File`
 * recién elegido para que el cambio se vea instantáneo aunque el upload
 * todavía esté en curso.
 */
export function CommunityLogoUploader({
  communityId,
  currentLogoUrl,
  communityName,
  className,
}: CommunityLogoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

  const displayUrl = optimisticUrl ?? currentLogoUrl;
  const hasLogo = Boolean(displayUrl);

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    // Reset input para que el mismo archivo pueda re-seleccionarse después.
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED_MIME.has(file.type)) {
      setError('Formato no permitido. Usa PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('El logo debe pesar máximo 2MB.');
      return;
    }

    // Preview optimista — revocamos cuando termina el transition.
    const previewUrl = URL.createObjectURL(file);
    setOptimisticUrl(previewUrl);

    const fd = new FormData();
    fd.set('community_id', communityId);
    fd.set('file', file);

    startTransition(async () => {
      const result = await uploadCommunityLogo(fd);
      URL.revokeObjectURL(previewUrl);
      setOptimisticUrl(null);
      if (!result.ok) {
        setError(result.error ?? 'No pudimos subir el logo');
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    const fd = new FormData();
    fd.set('community_id', communityId);

    startTransition(async () => {
      const result = await deleteCommunityLogo(fd);
      if (!result.ok) {
        setError(result.error ?? 'No pudimos eliminar el logo');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={cn('flex flex-col items-start gap-4 sm:flex-row sm:items-center', className)}>
      <div className="relative">
        <Avatar
          seed={communityId}
          name={communityName}
          src={displayUrl}
          size="2xl"
          className="size-24 text-2xl ring-1 ring-border"
        />
        {isPending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 backdrop-blur-sm">
            <Loader2 className="text-crown size-6 animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-3" />
            {hasLogo ? 'Cambiar logo' : 'Subir logo'}
          </Button>

          {hasLogo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
              Eliminar logo
            </Button>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={handleSelect}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        <p className="text-muted-foreground text-xs">
          PNG, JPG o WEBP. Máximo 2MB.
        </p>

        {error ? (
          <p
            role="alert"
            className="text-destructive border-destructive/30 bg-destructive/10 rounded-md border px-2.5 py-1.5 text-xs"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
