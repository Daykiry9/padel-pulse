import Link from 'next/link';

import { KingLogo } from '@/components/marketing/king-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative isolate min-h-screen">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(255,197,61,0.18),transparent_60%)]"
        aria-hidden
      />
      <div className="court-grid absolute inset-0 -z-10 opacity-30" aria-hidden />
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
