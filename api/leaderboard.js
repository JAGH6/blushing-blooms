import { getSupabase } from '../lib/db.js';
import { json, corsPreflight } from '../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const date = req.query?.date || new Date().toISOString().slice(0, 10);

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const { data: rows, error } = await sb
    .from('daily_scores')
    .select('score, completion_time_seconds, level_reached, players(display_name)')
    .eq('date', date)
    .order('score', { ascending: false })
    .order('completion_time_seconds', { ascending: true });

  if (error) return json(res, { error: error.message }, 500);

  const leaderboard = (rows || []).map((r, i) => ({
    rank: i + 1,
    displayName: r.players?.display_name || 'Player',
    score: r.score,
    completionTimeSeconds: r.completion_time_seconds,
    levelReached: r.level_reached,
  }));

  return json(res, { date, leaderboard });
}
