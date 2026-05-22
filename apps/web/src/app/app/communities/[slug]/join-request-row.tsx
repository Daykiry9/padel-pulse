'use client';

import { useTransition, useState } from 'react';
import { Check, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { decideJoinRequest } from '@/lib/community-approval-actions';

const CATEGORIES = [
  { value: '', label: 'No asignar' },
  { value: 'libre', label: 'Libre / Pro' },
  { value: 'primera', label: '1ra' },
  { value: 'segunda', label: '2da' },
  { value: 'tercera', label: '3ra' },
  { value: 'cuarta', label: '4ta' },
  { value: 'quinta', label: '5ta' },
  { value: 'sexta', label: '6ta' },
  { value: 'septima', label: '7ma' },
  { value: 'queens_libre', label: 'Queens Libre' },
  { value: 'queens_a', label: 'Queens A' },
  { value: 'queens_b', label: 'Queens B' },
  { value: 'queens_c', label: 'Queens C' },
  { value: 'queens_d', label: 'Queens D' },
  { value: 'queens_e', label: 'Queens E' },
];

export function JoinRequestRow({
  request,
}: {
  request: {
    id: string;
    profile_id: string;
    message: string | null;
    created_at: string;
    profiles: { display_name: string; skill_category: string | null; city: string | null } | null;
  };
}) {
  const [category, setCategory] = useState(request.profiles?.skill_category ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: 'approved' | 'rejected') {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set('request_id', request.id);
      fd.set('decision', decision);
      if (decision === 'approved' && category) fd.set('assigned_category', category);
      const result = await decideJoinRequest(fd);
      if (!result.ok) setError(result.error ?? 'Error');
    });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-base">{request.profiles?.display_name ?? '?'}</div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest">
            {request.profiles?.city && <span>{request.profiles.city}</span>}
            {request.profiles?.skill_category && (
              <Badge variant="muted" className="text-[9px]">
                {request.profiles.skill_category}
              </Badge>
            )}
            <span>· {new Date(request.created_at).toLocaleDateString('es-CO')}</span>
          </div>
          {request.message && (
            <p className="text-foreground/80 border-border/40 mt-3 border-l-2 pl-2 text-xs italic normal-case">
              &ldquo;{request.message}&rdquo;
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              Asignar: {c.label}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="default"
          onClick={() => decide('approved')}
          disabled={isPending}
        >
          <Check className="size-3" />
          Aceptar
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => decide('rejected')}
          disabled={isPending}
        >
          <X className="size-3" />
          Rechazar
        </Button>
      </div>
      {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
    </Card>
  );
}
