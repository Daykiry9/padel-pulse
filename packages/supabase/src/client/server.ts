import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import type { Database } from '../database.types';

export interface CookieAdapter {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}

export function createServerClient(url: string, anonKey: string, cookies: CookieAdapter) {
  return createSsrServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) =>
        cookies.setAll(toSet),
    },
  });
}
