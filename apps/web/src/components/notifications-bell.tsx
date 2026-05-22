'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellDot, Check } from 'lucide-react';

import { markAllNotificationsRead, markNotificationRead } from '@/lib/notification-actions';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const days = Math.round(hr / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function NotificationsBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function clickNotification(n: NotificationItem) {
    startTransition(async () => {
      if (!n.read_at) await markNotificationRead(n.id);
      setOpen(false);
      if (n.link) router.push(n.link);
    });
  }

  function clickMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} notificaciones sin leer` : 'Notificaciones'}
        className="text-muted-foreground hover:text-foreground relative transition-colors"
      >
        {unreadCount > 0 ? <BellDot className="size-4" /> : <Bell className="size-4" />}
        {unreadCount > 0 && (
          <span className="bg-crown text-crown-foreground absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full text-[9px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="border-border/40 bg-card absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-lg border shadow-lg">
            <div className="border-border/40 flex items-center justify-between border-b px-4 py-3">
              <span className="font-display text-sm tracking-tight">NOTIFICACIONES</span>
              {unreadCount > 0 && (
                <button
                  onClick={clickMarkAll}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  <Check className="size-3" />
                  Leer todas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                  No tienes notificaciones aún.
                </div>
              ) : (
                <ul className="divide-border/30 divide-y">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => clickNotification(n)}
                        className={`hover:bg-muted/40 flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors ${
                          !n.read_at ? 'bg-crown/[0.03]' : ''
                        }`}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <span
                            className={`text-sm ${
                              !n.read_at ? 'font-semibold text-foreground' : 'text-foreground/80'
                            }`}
                          >
                            {n.title}
                          </span>
                          {!n.read_at && (
                            <span className="bg-crown mt-1.5 size-1.5 shrink-0 rounded-full" />
                          )}
                        </div>
                        {n.body && (
                          <span className="text-muted-foreground line-clamp-2 text-xs normal-case">
                            {n.body}
                          </span>
                        )}
                        <span className="text-muted-foreground/60 text-[10px] uppercase tracking-widest">
                          {formatRelative(n.created_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link
              href="/app"
              className="border-border/40 text-muted-foreground hover:text-foreground block border-t px-4 py-2 text-center text-xs uppercase tracking-widest"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
