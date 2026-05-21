import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Globe, LogOut, Trophy, Users } from 'lucide-react';

import { KingLogo } from '@/components/marketing/king-logo';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth-actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, skill_category, gender, city')
    .eq('id', user.id)
    .single();

  if (!profile?.skill_category) redirect('/onboarding');

  const isQueens = profile.gender === 'female' && profile.skill_category?.startsWith('queens_');

  return (
    <div className={`bg-background min-h-screen ${isQueens ? 'theme-queens' : ''}`}>
      <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/app" className="flex items-center gap-2">
            <KingLogo />
            <span className="font-display text-base tracking-tight">
              PADEL<span className="text-crown">KING</span>
            </span>
          </Link>
          <nav className="text-muted-foreground hidden items-center gap-6 text-xs uppercase tracking-widest md:flex">
            <Link href="/app" className="hover:text-foreground transition-colors">
              <Trophy className="inline size-4 mr-1.5" />
              Dashboard
            </Link>
            <Link href="/app/communities" className="hover:text-foreground transition-colors">
              <Globe className="inline size-4 mr-1.5" />
              Comunidades
            </Link>
            <Link href="/app/teams" className="hover:text-foreground transition-colors">
              <Users className="inline size-4 mr-1.5" />
              Mi equipo
            </Link>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">
              <Crown className="inline size-4 mr-1.5" />
              Torneos
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs uppercase tracking-wider md:inline">
              {profile.display_name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
