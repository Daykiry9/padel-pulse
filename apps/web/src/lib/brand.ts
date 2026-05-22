import { cookies } from 'next/headers';

export type Brand = 'kings' | 'queens';

/**
 * Lee la cookie `pk_brand` para decidir qué tema aplicar globalmente.
 * Default: 'kings'. La cookie la setea <BrandSwitcher /> del usuario.
 */
export async function getBrandFromCookie(): Promise<Brand> {
  const store = await cookies();
  const value = store.get('pk_brand')?.value;
  return value === 'queens' ? 'queens' : 'kings';
}
