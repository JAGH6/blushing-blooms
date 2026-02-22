import { getSupabase } from '../../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../../lib/auth.js';
import { json, corsPreflight } from '../../lib/res.js';

function dateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
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

  const pid = payload.playerId;
  const startOfTime = dateOffset(365);

  const { data: scores } = await sb
    .from('daily_scores')
    .select('score, date')
    .eq('player_id', pid)
    .gte('date', startOfTime)
    .order('date', { ascending: false });

  const highScore = scores?.length ? Math.max(...scores.map((r) => r.score)) : 0;
  const avgScore = scores?.length ? Math.round(scores.reduce((a, r) => a + r.score, 0) / scores.length) : 0;

  const { data: streakRow } = await sb.from('player_streaks').select('current_streak, longest_streak').eq('player_id', pid).single();
  const currentStreak = streakRow?.current_streak ?? 0;
  const longestStreak = streakRow?.longest_streak ?? 0;

  const { data: achievements } = await sb.from('achievements').select('achievement_key, earned_at').eq('player_id', pid).order('earned_at', { ascending: false });
  const achievementList = (achievements || []).map((a) => ({ key: a.achievement_key, earnedAt: a.earned_at }));

  return json(res, {
    highScore,
    averageScore: avgScore,
    currentStreak,
    longestStreak,
    achievements: achievementList,
  });
}
