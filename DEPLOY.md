# Deploy a Vercel

## Setup inicial (una sola vez)

1. **Import en Vercel**: nuevo proyecto desde GitHub → seleccionar el repo.
2. **Framework Preset**: Next.js (Vercel lo detecta solo).
3. **Root Directory**: `apps/web` (Vercel lo sugiere automáticamente porque ahí está el `next.config`).
4. **Build & Development Settings**: déjalo en defaults (`pnpm install`, `pnpm build`). Vercel detecta `pnpm-workspace.yaml` en la raíz y resuelve workspaces solo.
5. **Environment Variables** (copiar al panel de Vercel, Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Production-only — sensible)
   - `NEXT_PUBLIC_APP_URL` → `https://<tu-dominio>.vercel.app` (Production)
6. **Deploy**.

## Validar localmente antes de pushear

```bash
cd apps/web
pnpm typecheck   # debe estar verde
pnpm build       # debe terminar sin errores
```

## Bugs comunes que rompieron deploys antes

- **`prefer-const` rompe el build** — `next lint` corre en build de Vercel.
- **NEXT_PUBLIC_* sin setear** — `process.env.NEXT_PUBLIC_SUPABASE_URL!` es `undefined` y la primera request a Supabase tira null.
- **`vercel.json` en raíz + Root Directory = `apps/web`** — config conflict. Si Root Directory = `apps/web`, NO necesitas `vercel.json` (Vercel detecta todo nativamente).

## Post-deploy: verificar

1. Visitar `https://<dominio>/` → landing renderiza
2. Visitar `https://<dominio>/signup` → crear cuenta
3. Completar onboarding → entrar a `/app`
4. Verificar en Supabase que el profile se creó

## Custom domain (opcional)

`padelking.co` → Vercel → Settings → Domains → agregar. DNS:
- `A` record → `76.76.21.21`
- `CNAME` para `www` → `cname.vercel-dns.com`

## Si necesitas configurar el build manualmente

Si por alguna razón quieres mantener Root Directory = `.` (raíz del monorepo) en lugar de `apps/web`, crea `vercel.json` en la raíz con:

```json
{
  "buildCommand": "pnpm turbo build --filter=web",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

Pero la opción default (Root Directory = `apps/web` sin vercel.json) es más simple.
