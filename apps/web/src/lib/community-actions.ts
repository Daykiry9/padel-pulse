'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getSession, getSupabaseServerClient } from './supabase/server';
import type { ActionResult } from './auth-actions';

const ACTIVE_COMMUNITY_COOKIE = 'active_community_id';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export async function createCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const city = String(formData.get('city') ?? '').trim() || 'Bogotá';

  if (name.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres' };

  const supabase = await getSupabaseServerClient();

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase
    .from('communities')
    .insert({
      slug,
      name,
      description,
      city,
      owner_id: user.id,
    } as never)
    .select('slug')
    .single();

  if (error) return { ok: false, error: error.message };

  const slugResult = (data as { slug: string } | null)?.slug ?? slug;
  revalidatePath('/app/communities');
  revalidatePath('/app');
  return { ok: true, redirectTo: `/app/communities/${slugResult}` };
}

// joinCommunity ahora delega al flujo de request — la membresía requiere
// aprobación del owner/admin de la comunidad.
import { requestJoinCommunity } from './community-approval-actions';

export async function joinCommunity(formData: FormData): Promise<ActionResult> {
  return requestJoinCommunity(formData);
}

export async function updateCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  if (!UUID_RE.test(communityId)) return { ok: false, error: 'Comunidad inválida' };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const city = String(formData.get('city') ?? '').trim();
  const isPublic = String(formData.get('is_public') ?? 'true') === 'true';

  if (name.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres' };
  if (city.length < 2) return { ok: false, error: 'Ciudad inválida' };

  const supabase = await getSupabaseServerClient();

  // Verificamos ownership explicito antes de tocar (la RLS ya lo cubre pero
  // queremos un error claro en vez de "0 rows updated").
  const { data: existing } = await supabase
    .from('communities')
    .select('id, owner_id, slug')
    .eq('id', communityId)
    .maybeSingle();

  if (!existing) return { ok: false, error: 'Comunidad no encontrada' };
  if ((existing as { owner_id: string }).owner_id !== user.id) {
    return { ok: false, error: 'Solo el owner puede editar la comunidad' };
  }

  const { error } = await supabase
    .from('communities')
    .update({ name, description, city, is_public: isPublic } as never)
    .eq('id', communityId);

  if (error) return { ok: false, error: error.message };

  const slug = (existing as { slug: string }).slug;
  revalidatePath(`/app/communities/${slug}`);
  revalidatePath('/app/communities');
  revalidatePath('/app');
  return { ok: true, redirectTo: `/app/communities/${slug}/settings?saved=1` };
}

export async function deleteCommunity(formData: FormData): Promise<void> {
  const user = await getSession();
  if (!user) redirect('/login');

  const communityId = String(formData.get('community_id') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const confirmation = String(formData.get('confirmation') ?? '').trim();

  if (!UUID_RE.test(communityId) || !slug) {
    redirect(`/app/communities/${slug}/settings?delete_error=invalid`);
  }

  if (confirmation !== 'ELIMINAR') {
    redirect(`/app/communities/${slug}/settings?delete_error=confirmation`);
  }

  const supabase = await getSupabaseServerClient();

  // Gate de ownership.
  const { data: existing } = await supabase
    .from('communities')
    .select('id, owner_id')
    .eq('id', communityId)
    .maybeSingle();

  if (!existing) redirect('/app/communities');
  if ((existing as { owner_id: string }).owner_id !== user.id) {
    redirect(`/app/communities/${slug}/settings?delete_error=not_owner`);
  }

  // Gate: no debe haber torneos in_progress en esta comunidad.
  const { count: inProgressCount } = await supabase
    .from('tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('status', 'in_progress');

  if ((inProgressCount ?? 0) > 0) {
    redirect(`/app/communities/${slug}/settings?delete_error=tournaments`);
  }

  const { error } = await supabase.from('communities').delete().eq('id', communityId);
  if (error) {
    console.error('[deleteCommunity] supabase error:', error);
    redirect(`/app/communities/${slug}/settings?delete_error=server`);
  }

  revalidatePath('/app/communities');
  revalidatePath('/app');
  redirect('/app/communities?deleted=1');
}

export async function leaveCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  if (!UUID_RE.test(communityId)) return { ok: false, error: 'Comunidad inválida' };

  const supabase = await getSupabaseServerClient();

  // Confirmar membresia + leer mi rol.
  const { data: meRow } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!meRow) return { ok: false, error: 'No perteneces a esta comunidad' };

  const myRole = (meRow as { role: 'owner' | 'admin' | 'member' }).role;

  if (myRole === 'owner') {
    // Contar otros owners (excluyendome).
    const { count: otherOwners } = await supabase
      .from('community_members')
      .select('profile_id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('role', 'owner')
      .neq('profile_id', user.id);

    if ((otherOwners ?? 0) === 0) {
      return {
        ok: false,
        error: 'Sos el único owner. Transferí ownership antes de abandonar.',
      };
    }
  }

  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('profile_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/app/communities');
  revalidatePath('/app');
  return { ok: true, redirectTo: '/app/communities?left=1' };
}

const LOGO_BUCKET = 'community-logos';
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const LOGO_ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function assertCommunityOwner(
  communityId: string,
  userId: string,
): Promise<
  | { ok: true; community: { id: string; slug: string; logo_url: string | null } }
  | { ok: false; error: string }
> {
  if (!UUID_RE.test(communityId)) return { ok: false, error: 'Comunidad inválida' };
  const supabase = await getSupabaseServerClient();
  const { data: existing } = await supabase
    .from('communities')
    .select('id, owner_id, slug, logo_url')
    .eq('id', communityId)
    .maybeSingle();
  if (!existing) return { ok: false, error: 'Comunidad no encontrada' };
  const row = existing as {
    id: string;
    owner_id: string;
    slug: string;
    logo_url: string | null;
  };
  if (row.owner_id !== userId) {
    return { ok: false, error: 'Solo el owner puede editar la comunidad' };
  }
  return { ok: true, community: { id: row.id, slug: row.slug, logo_url: row.logo_url } };
}

export async function uploadCommunityLogo(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Archivo inválido' };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: 'El logo debe pesar máximo 2MB' };
  }
  const mime = file.type;
  if (!LOGO_ALLOWED_MIME.has(mime)) {
    return { ok: false, error: 'Formato no permitido. Usa PNG, JPG, WEBP o SVG.' };
  }

  const owned = await assertCommunityOwner(communityId, user.id);
  if (!owned.ok) return { ok: false, error: owned.error };

  const supabase = await getSupabaseServerClient();
  const ext = MIME_TO_EXT[mime] ?? 'bin';
  const path = `${communityId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: mime,
      cacheControl: '3600',
    });
  if (uploadError) {
    return { ok: false, error: uploadError.message || 'No se pudo subir el logo' };
  }

  const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl;
  if (!publicUrl) {
    // Best-effort cleanup si no obtuvimos URL.
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    return { ok: false, error: 'No se pudo obtener la URL del logo' };
  }

  const { error: updateError } = await supabase
    .from('communities')
    .update({ logo_url: publicUrl } as never)
    .eq('id', communityId);
  if (updateError) {
    // Rollback del objeto subido para no dejar huérfano.
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    return { ok: false, error: updateError.message };
  }

  // Si había un logo previo, lo limpiamos del bucket.
  const previousUrl = owned.community.logo_url;
  if (previousUrl) {
    const previousPath = extractStoragePath(previousUrl, LOGO_BUCKET);
    if (previousPath && previousPath !== path) {
      await supabase.storage.from(LOGO_BUCKET).remove([previousPath]);
    }
  }

  revalidatePath('/app/communities');
  revalidatePath(`/app/communities/${owned.community.slug}`);
  revalidatePath(`/app/communities/${owned.community.slug}/settings`);
  revalidatePath('/app');
  return { ok: true };
}

export async function deleteCommunityLogo(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  const owned = await assertCommunityOwner(communityId, user.id);
  if (!owned.ok) return { ok: false, error: owned.error };

  const supabase = await getSupabaseServerClient();
  const currentUrl = owned.community.logo_url;

  if (currentUrl) {
    const path = extractStoragePath(currentUrl, LOGO_BUCKET);
    if (path) {
      const { error: removeError } = await supabase.storage
        .from(LOGO_BUCKET)
        .remove([path]);
      if (removeError) {
        return { ok: false, error: removeError.message || 'No se pudo borrar el logo' };
      }
    }
  }

  const { error: updateError } = await supabase
    .from('communities')
    .update({ logo_url: null } as never)
    .eq('id', communityId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath('/app/communities');
  revalidatePath(`/app/communities/${owned.community.slug}`);
  revalidatePath(`/app/communities/${owned.community.slug}/settings`);
  revalidatePath('/app');
  return { ok: true };
}

// getPublicUrl produce algo como:
//   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// Esta función invierte esa convención para obtener el `path` que requiere
// .remove(). Si la URL no pertenece al bucket esperado, devuelve null.
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = url.pathname.slice(idx + marker.length);
    if (!raw) return null;
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export async function setActiveCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  if (!UUID_RE.test(communityId)) {
    return { ok: false, error: 'Comunidad inválida' };
  }

  const supabase = await getSupabaseServerClient();

  // SOURCE OF TRUTH: profiles.active_community_id.
  // RLS (auth.uid() = id) + validation trigger validan que sea membership real.
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ active_community_id: communityId } as never)
    .eq('id', user.id);

  if (updateError) {
    // El trigger lanza check_violation si no es membership.
    const msg = updateError.message ?? '';
    if (msg.includes('active_community_id') || msg.includes('membership')) {
      return { ok: false, error: 'No perteneces a esa comunidad' };
    }
    return { ok: false, error: msg || 'No se pudo cambiar la comunidad activa' };
  }

  // Cookie cliente-side como hint (cache rápido para evitar query extra).
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return { ok: true };
}
