import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSession } from '@/lib/supabase/server';
import { getServiceRoleClient } from '@/lib/supabase/admin';
import { redeemInvitation } from '@/lib/invitation-actions';

type InvitationKind = 'tournament' | 'team' | 'community';

type Preview = {
  kind: InvitationKind;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  memberCount?: number;
};

type PreviewResult = { ok: true; data: Preview } | { ok: false; error: string };

/**
 * Fetch público de la info mínima de la invitación. Usa service role porque las
 * tablas hijas (communities/teams/tournaments) pueden tener RLS más estricta
 * y queremos render consistente pre-login. Wrap completo en try/catch: si algo
 * rompe, devolvemos error amistoso (no 500).
 */
async function fetchPreview(code: string): Promise<PreviewResult> {
  try {
    // Validación rápida del code: el regex de DB es ^[A-Za-z0-9_-]{6,32}$.
    // Si no matchea ese formato, ahorramos el query.
    if (!/^[A-Za-z0-9_-]{6,32}$/.test(code)) {
      return { ok: false, error: 'Link de invitación inválido o expirado' };
    }

    const admin = getServiceRoleClient();

    const invRes = await admin
      .from('invitation_tokens')
      .select('id, kind, target_id, expires_at, max_uses, use_count')
      .eq('code', code)
      .maybeSingle();

    const invite = invRes.data as {
      id: string;
      kind: InvitationKind;
      target_id: string;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
    } | null;

    if (!invite) {
      return { ok: false, error: 'Link de invitación inválido o expirado' };
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { ok: false, error: 'Este link de invitación ya expiró. Pídele uno nuevo al organizador.' };
    }
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return { ok: false, error: 'Este link ya llegó a su límite de usos.' };
    }

    if (invite.kind === 'community') {
      const { data: cData } = await admin
        .from('communities')
        .select('name, city, logo_url')
        .eq('id', invite.target_id)
        .maybeSingle();
      const row = cData as { name: string; city: string | null; logo_url: string | null } | null;
      if (!row) return { ok: false, error: 'La comunidad ya no existe' };

      const { count } = await admin
        .from('community_members')
        .select('profile_id', { count: 'exact', head: true })
        .eq('community_id', invite.target_id);

      return {
        ok: true,
        data: {
          kind: 'community',
          title: row.name,
          subtitle: row.city,
          image: row.logo_url,
          memberCount: count ?? 0,
        },
      };
    }

    if (invite.kind === 'team') {
      const { data: tData } = await admin
        .from('teams')
        .select('name, logo_url')
        .eq('id', invite.target_id)
        .maybeSingle();
      const row = tData as { name: string; logo_url: string | null } | null;
      if (!row) return { ok: false, error: 'El equipo ya no existe' };

      const { count } = await admin
        .from('team_members')
        .select('profile_id', { count: 'exact', head: true })
        .eq('team_id', invite.target_id)
        .eq('is_active', true);

      return {
        ok: true,
        data: {
          kind: 'team',
          title: row.name,
          subtitle: 'Equipo',
          image: row.logo_url,
          memberCount: count ?? 0,
        },
      };
    }

    if (invite.kind === 'tournament') {
      const { data: tData } = await admin
        .from('tournaments')
        .select('name, banner_url, starts_at, club_id')
        .eq('id', invite.target_id)
        .maybeSingle();
      const row = tData as {
        name: string;
        banner_url: string | null;
        starts_at: string | null;
        club_id: string | null;
      } | null;
      if (!row) return { ok: false, error: 'El torneo ya no existe' };

      let subtitle: string | null = null;
      if (row.club_id) {
        const { data: cData } = await admin
          .from('clubs')
          .select('name, city')
          .eq('id', row.club_id)
          .maybeSingle();
        const clubRow = cData as { name: string; city: string | null } | null;
        if (clubRow) {
          subtitle = clubRow.city ? `${clubRow.name} · ${clubRow.city}` : clubRow.name;
        }
      }

      return {
        ok: true,
        data: {
          kind: 'tournament',
          title: row.name,
          subtitle,
          image: row.banner_url,
        },
      };
    }

    return { ok: false, error: 'Tipo de invitación desconocido' };
  } catch (err) {
    console.error('[invite/page] fetchPreview crash:', err);
    return { ok: false, error: 'Link de invitación inválido o expirado' };
  }
}

function kindLabel(kind: InvitationKind): string {
  switch (kind) {
    case 'community':
      return 'COMUNIDAD';
    case 'team':
      return 'EQUIPO';
    case 'tournament':
      return 'TORNEO';
  }
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-6 pb-12">
        {children}
      </main>
    </div>
  );
}

function ErrorCard({ error, code }: { error: string; code: string }) {
  return (
    <Card className="w-full p-8 text-center">
      <h1 className="font-display text-3xl tracking-tight">INVITACIÓN INVÁLIDA</h1>
      <p className="text-muted-foreground mt-4 text-sm">{error}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="crown" asChild>
          <Link href={`/signup?invite=${encodeURIComponent(code)}`}>Crear cuenta igual</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </Card>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getSession();

  // Autenticado → resolver el invite y redirigir directo (sin preview).
  if (user) {
    try {
      const result = await redeemInvitation(code);
      if (result.redirectTo) {
        redirect(result.redirectTo);
      }
      return (
        <PageShell>
          <ErrorCard error={result.error ?? 'Link inválido o expirado.'} code={code} />
        </PageShell>
      );
    } catch (err) {
      // redirect() de next/navigation lanza un error especial — re-throw para
      // que Next lo intercepte como redirect real, no como crash.
      if (err && typeof err === 'object' && 'digest' in err) throw err;
      console.error('[invite/page] redeem crash:', err);
      return (
        <PageShell>
          <ErrorCard error="No pudimos resolver el link. Intentá de nuevo." code={code} />
        </PageShell>
      );
    }
  }

  // No autenticado → preview de la invitación antes de pedir signup/login.
  const preview = await fetchPreview(code);
  if (!preview.ok) {
    return (
      <PageShell>
        <ErrorCard error={preview.error} code={code} />
      </PageShell>
    );
  }

  const { kind, title, subtitle, image, memberCount } = preview.data;
  const nextPath = `/i/${code}`;

  return (
    <PageShell>
      <Card className="w-full overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="bg-muted aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="bg-muted flex aspect-[16/9] w-full items-center justify-center">
            <span className="text-muted-foreground font-display text-2xl tracking-tight">
              {kindLabel(kind)}
            </span>
          </div>
        )}

        <div className="p-6">
          <div className="text-crown font-display text-xs tracking-[0.18em]">
            INVITACIÓN A {kindLabel(kind)}
          </div>
          <h1 className="font-display mt-2 text-2xl leading-tight tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          ) : null}
          {typeof memberCount === 'number' ? (
            <p className="text-muted-foreground mt-3 text-xs">
              {memberCount} {kind === 'team' ? 'jugadores activos' : 'miembros'}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            <Button variant="crown" asChild>
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>
                Iniciar sesión para unirme
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/signup?invite=${encodeURIComponent(code)}`}>Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
