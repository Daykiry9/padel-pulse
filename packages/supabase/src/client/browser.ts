import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

export function createBrowserClient(url: string, anonKey: string) {
  return createSsrBrowserClient<Database>(url, anonKey);
}
