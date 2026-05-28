import { signInWithOAuthProvider } from '@/lib/auth-actions';

/**
 * Botones de Sign in with Apple / Google. Server-rendered: el form invoca el
 * server action que arma la URL del proveedor y redirige. Sigue (a grandes
 * rasgos) las guidelines de marca de cada proveedor: Apple negro con su logo,
 * Google blanco con su logo "G" multicolor.
 */

export function AppleSignInButton({ next }: { next?: string }) {
  return (
    <form action={signInWithOAuthProvider}>
      <input type="hidden" name="provider" value="apple" />
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-900"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M17.05 12.5c-.03-2.84 2.32-4.21 2.43-4.27-1.32-1.94-3.39-2.2-4.13-2.23-1.76-.18-3.43 1.03-4.32 1.03-.9 0-2.27-1-3.73-.97-1.92.03-3.69 1.12-4.68 2.83-2 3.47-.51 8.6 1.43 11.42.95 1.38 2.07 2.92 3.54 2.86 1.42-.06 1.96-.92 3.68-.92 1.71 0 2.2.92 3.71.89 1.53-.03 2.5-1.4 3.43-2.78 1.08-1.6 1.53-3.15 1.56-3.23-.03-.01-2.99-1.15-3.02-4.55zM14.16 4.31c.78-.95 1.31-2.27 1.16-3.58-1.13.05-2.49.75-3.3 1.7-.73.84-1.36 2.18-1.19 3.46 1.26.1 2.55-.64 3.33-1.58z" />
        </svg>
        Continuar con Apple
      </button>
    </form>
  );
}

export function GoogleSignInButton({ next }: { next?: string }) {
  return (
    <form action={signInWithOAuthProvider}>
      <input type="hidden" name="provider" value="google" />
      {next && <input type="hidden" name="next" value={next} />}
      <button
        type="submit"
        className="border-border flex w-full items-center justify-center gap-2 rounded-md border bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100"
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continuar con Google
      </button>
    </form>
  );
}

export function OAuthButtons({ next }: { next?: string }) {
  return (
    <div className="space-y-2">
      <AppleSignInButton next={next} />
      <GoogleSignInButton next={next} />
    </div>
  );
}
