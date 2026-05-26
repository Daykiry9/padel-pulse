import { NextResponse } from 'next/server';

import { applyMatchEloAndNotify } from '@/lib/tournament-actions';
import { getServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Auto-confirma marcadores que llevan 48h pendientes sin que la otra pareja
// confirme ni dispute (ragequit). Invocado por Vercel Cron (ver vercel.json).
const HOURS_TO_AUTO_CONFIRM = 48;

export async function GET(request: Request) {
  // Vercel Cron envía Authorization: Bearer ${CRON_SECRET}.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const admin = getServiceRoleClient();
  const cutoff = new Date(Date.now() - HOURS_TO_AUTO_CONFIRM * 3600 * 1000).toISOString();

  const { data, error } = await admin
    .from('matches')
    .select('id')
    .eq('status', 'pending_confirmation')
    .lt('reported_at', cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? []) as { id: string }[];
  let completed = 0;
  for (const m of matches) {
    const { error: updErr } = await admin
      .from('matches')
      .update({
        status: 'completed',
        confirmed_by_one: true,
        confirmed_by_two: true,
        ended_at: new Date().toISOString(),
      } as never)
      .eq('id', m.id);
    if (updErr) continue;
    await applyMatchEloAndNotify(m.id);
    completed += 1;
  }

  return NextResponse.json({ ok: true, scanned: matches.length, completed });
}
