import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

/**
 * Cliente con service role — SOLO para uso en servidor / edge functions.
 * Nunca exponer la key en el frontend.
 */
export function createServiceClient(url: string, serviceKey: string) {
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
