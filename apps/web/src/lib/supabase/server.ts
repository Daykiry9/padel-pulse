import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@padelking/supabase';

/**
 * Cast a un tipo más permisivo. La inferencia profunda de Supabase + Database
 * generado choca con la firma del SupabaseClient en versiones recientes.
 * El runtime es correcto; perdemos algo de safety en queries que casteamos.
 */
type Db = Database;
export type ServerSupabase = SupabaseClient<Db, 'public'>;

export async function getSupabaseServerClient(): Promise<ServerSupabase> {
  const cookieStore = await cookies();

  const client = createServerClient<Db>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: { name: string; value: string; options?: CookieOptions }[]) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  return client as unknown as ServerSupabase;
}

export async function getSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
