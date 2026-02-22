import { getSupabase } from '../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../lib/auth.js';
import { json, corsPreflight } from '../lib/res.js';

function todayUtc() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const token = getBearerFromRequest(req);
  const payload = verifyToken(token);
  if (!payload?.playerId) return json(res, { error: 'Unauthorized' }, 401);

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const date = todayUtc();
  const { data: existing } = await sb
    .from('daily_scores')
    .select('score, completion_time_seconds')
    .eq('player_id', payload.playerId)
    .eq('date', date)
    .single();

  if (existing) {
    return json(res, {
      canPlay: false,
      alreadyPlayedToday: {
        score: existing.score,
        completionTimeSeconds: existing.completion_time_seconds,
      },
    });
  }
  return json(res, { canPlay: true });
}
