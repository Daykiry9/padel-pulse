# Deploy a Vercel

## Setup inicial (una sola vez)

1. **Import en Vercel**: nuevo proyecto desde GitHub → seleccionar el repo.
2. **Root Directory**: déjalo en `.` (raíz del monorepo). El `vercel.json` se encarga del resto.
3. **Framework Preset**: Next.js (Vercel lo detecta solo gracias al `framework` del vercel.json).
4. **Environment Variables**: copiar al panel de Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Production, sensible — no Preview)
   - `NEXT_PUBLIC_APP_URL` → `https://<tu-dominio>.vercel.app` (en Production)
5. **Deploy**.

## Comandos (definidos en `vercel.json`)

```
install:  pnpm install --frozen-lockfile
build:    pnpm turbo build --filter=web
output:   apps/web/.next
```

## CI ignore inteligente

El `ignoreCommand` corta deploys si el cambio no toca `apps/web/`, `packages/`, `turbo.json`, o el lockfile. Útil cuando edites el folder de mobile o de docs y no quieras gastar minutos.

## Validar localmente antes de pushear

```bash
cd apps/web
pnpm typecheck   # debe estar verde
pnpm build       # debe terminar sin errores
```

## Bugs comunes que rompieron deploys antes

- `prefer-const` falla el build de Vercel (next lint corre en build).
- Variables NEXT_PUBLIC_* deben estar SET en Vercel — si no, `process.env.NEXT_PUBLIC_SUPABASE_URL!` es `undefined` y la primera request a supabase tira.
- `pnpm@10.x` requiere `packageManager` field en root `package.json` (ya está).

## Post-deploy: verificar

1. Visitar `https://<dominio>/` → landing renderiza
2. Visitar `https://<dominio>/signup` → crear cuenta
3. Completar onboarding → entrar a `/app`
4. Verificar en Supabase que el profile se creó

## Custom domain (opcional)

`padelking.co` → Vercel → settings → Domains → agregar. DNS:
- `A` record → `76.76.21.21`
- `CNAME` para `www` → `cname.vercel-dns.com`
