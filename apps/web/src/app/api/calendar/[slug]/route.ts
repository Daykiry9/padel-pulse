import { getSupabaseServerClient } from '@/lib/supabase/server';

// Evento .ics del torneo para "Agregar al calendario" (Apple / Outlook / Google
// lo importan igual). Publico: solo expone lo que ya muestra el detalle.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('name, starts_at, ends_at, description')
    .eq('slug', slug)
    .maybeSingle();
  const t = data as { name: string; starts_at: string; ends_at: string | null; description: string | null } | null;
  if (!t) return new Response('Not found', { status: 404 });

  const start = new Date(t.starts_at);
  const end = t.ends_at ? new Date(t.ends_at) : new Date(start.getTime() + 3 * 3_600_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
  const url = `https://padelking.co/tournaments/${slug}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PadelKing//Torneos//ES',
    'BEGIN:VEVENT',
    `UID:${slug}@padelking.co`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`🎾 ${t.name}`)}`,
    `DESCRIPTION:${esc(`${t.description ? `${t.description}\n\n` : ''}${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(t.name)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
    },
  });
}
