'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Send } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { postChatMessage } from '@/lib/chat-actions';
import { formatTime } from '@/lib/format-date';

export interface ChatMessage {
  id: string;
  body: string;
  created_at: string;
  profile_id: string;
  profiles: { display_name: string | null } | null;
}

export function TournamentChat({
  tournamentId,
  initialMessages,
  currentUserId,
}: {
  tournamentId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Subscribe to realtime
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel(`chat_${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `target_id=eq.${tournamentId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            profile_id: string;
          };
          // Fetch display_name del autor (no viene en realtime payload)
          const { data: p } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', row.profile_id)
            .maybeSingle();
          const displayName = (p as { display_name: string } | null)?.display_name ?? null;

          setMessages((prev) => {
            // Evitar duplicado si ya está (sender optimistic update)
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                body: row.body,
                created_at: row.created_at,
                profile_id: row.profile_id,
                profiles: { display_name: displayName },
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const send = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('target_kind', 'tournament');
      fd.set('target_id', tournamentId);
      fd.set('body', body);
      const result = await postChatMessage(fd);
      if (result.ok) {
        setText('');
      } else {
        setError(result.error ?? 'Error');
      }
    });
  }, [text, tournamentId]);

  return (
    <Card className="flex h-[400px] flex-col p-0">
      <div className="border-border/40 flex items-center justify-between border-b px-4 py-3">
        <div className="font-display text-sm tracking-tight">CHAT DEL TORNEO</div>
        <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
          Solo participantes
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            Sin mensajes aún. Sé el primero en romper el hielo.
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.profile_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <Avatar
                  seed={m.profile_id}
                  name={m.profiles?.display_name ?? undefined}
                  size="sm"
                />
                <div
                  className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`text-[10px] uppercase tracking-widest ${
                      isMe ? 'text-crown' : 'text-muted-foreground'
                    }`}
                  >
                    {isMe ? 'Tú' : (m.profiles?.display_name ?? 'Anon')}
                    <span className="text-muted-foreground ml-1.5 normal-case tabular-nums">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                  <div
                    className={`mt-1 rounded-lg px-3 py-2 text-sm leading-snug ${
                      isMe
                        ? 'bg-crown/15 text-foreground'
                        : 'bg-muted/40 text-foreground/90'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-border/40 border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe algo…"
            maxLength={1000}
            disabled={isPending}
            className="border-border bg-background flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          <Button type="submit" variant="crown" size="sm" disabled={isPending || !text.trim()}>
            {isPending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            Enviar
          </Button>
        </form>
        {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
      </div>
    </Card>
  );
}
