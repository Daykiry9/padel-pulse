import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@padelking/supabase';

/**
 * Client con service role key — BYPASS RLS. Solo usar en server actions/route
 * handlers para operaciones cross-user (insertar notificaciones para otros
 * jugadores, etc.). NUNCA exponer al cliente.
 */
let cached: SupabaseClient<Database, 'public'> | null = null;

export function getServiceRoleClient(): SupabaseClient<Database, 'public'> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient<Database, 'public'>;
  return cached;
}
