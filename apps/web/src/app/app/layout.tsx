import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Globe, Shield, Trophy, Users } from 'lucide-react';

import { CommandPalette } from '@/components/command-palette';
import { KingLogo } from '@/components/marketing/king-logo';
import { NotificationsBell, type NotificationItem } from '@/components/notifications-bell';
import { UserMenu } from '@/components/user-menu';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');

  const supabase = await getSupabaseServerClient();
  const [profileRes, notificationsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, skill_category, gender, city, is_super_admin')
      .eq('id', user.id)
      .single(),
    supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const profile = profileRes.data as
    | { display_name: string; skill_category: string | null; gender: string | null; city: string | null; is_super_admin: boolean }
    | null;
  if (!profile?.skill_category) redirect('/onboarding');
  const isSuperAdmin = profile.is_super_admin === true;

  const notifications = (notificationsRes.data ?? []) as unknown as NotificationItem[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const isQueens = profile.gender === 'female' && profile.skill_category?.startsWith('queens_');

  return (
    <div className={`bg-background min-h-screen ${isQueens ? 'theme-queens' : ''}`}>
      <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link href="/app" className="flex items-center gap-2">
            <KingLogo />
            <span className="font-display text-base tracking-tight">
              PADEL<span className="text-crown">KING</span>
            </span>
          </Link>
          <nav
            aria-label="Navegación principal"
            className="text-muted-foreground hidden items-center gap-5 text-xs uppercase tracking-[0.15em] md:flex"
          >
            <Link href="/app" className="hover:text-foreground transition-colors">
              <Trophy className="inline size-3.5 mr-1" />
              Dashboard
            </Link>
            <Link href="/app/communities" className="hover:text-foreground transition-colors">
              <Globe className="inline size-3.5 mr-1" />
              Comunidades
            </Link>
            <Link href="/app/teams" className="hover:text-foreground transition-colors">
              <Users className="inline size-3.5 mr-1" />
              Equipo
            </Link>
            <Link href="/tournaments" className="hover:text-foreground transition-colors">
              <Crown className="inline size-3.5 mr-1" />
              Torneos
            </Link>
            {isSuperAdmin && (
              <Link
                href="/app/admin"
                className="text-crown hover:brightness-125 transition-colors"
              >
                <Shield className="inline size-3.5 mr-1" />
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <CommandPalette />
            </div>
            <NotificationsBell notifications={notifications} unreadCount={unreadCount} />
            <UserMenu
              userId={user.id}
              displayName={profile.display_name}
              city={profile.city}
              isSuperAdmin={isSuperAdmin}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">{children}</main>
    </div>
  );
}
