import { getSupabase } from '../lib/db.js';
import { json, corsPreflight } from '../lib/res.js';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const today = todayUtc();

  const { data: todayScores } = await sb
    .from('daily_scores')
    .select('score, completion_time_seconds, level_reached, players(display_name)')
    .eq('date', today)
    .order('score', { ascending: false })
    .order('completion_time_seconds', { ascending: true });

  const leaderboardToday = (todayScores || []).map((r, i) => ({
    rank: i + 1,
    displayName: r.players?.display_name || 'Player',
    score: r.score,
    completionTimeSeconds: r.completion_time_seconds,
    levelReached: r.level_reached,
  }));

  function dailyWinners(rows) {
    const byDate = {};
    (rows || []).forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });
    const winsByPlayerId = {};
    Object.values(byDate).forEach((dayRows) => {
      const best = dayRows.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.completion_time_seconds - b.completion_time_seconds;
      })[0];
      if (best) winsByPlayerId[best.player_id] = (winsByPlayerId[best.player_id] || 0) + 1;
    });
    return winsByPlayerId;
  }

  const startOfWeek = dateOffset(7);
  const { data: weekScores } = await sb
    .from('daily_scores')
    .select('date, player_id, score, completion_time_seconds, players(display_name)')
    .gte('date', startOfWeek)
    .lte('date', today);

  const weekWinsById = dailyWinners(weekScores);
  const weekWinners = Object.entries(weekWinsById).map(([playerId, wins]) => {
    const r = (weekScores || []).find((x) => x.player_id === playerId);
    return { displayName: r?.players?.display_name || 'Player', dailyWins: wins };
  }).sort((a, b) => b.dailyWins - a.dailyWins).slice(0, 10);

  const startOfMonth = dateOffset(30);
  const { data: monthScores } = await sb
    .from('daily_scores')
    .select('date, player_id, score, completion_time_seconds, players(display_name)')
    .gte('date', startOfMonth)
    .lte('date', today);

  const monthWinsById = dailyWinners(monthScores);
  const monthWinners = Object.entries(monthWinsById).map(([playerId, wins]) => {
    const r = (monthScores || []).find((x) => x.player_id === playerId);
    return { displayName: r?.players?.display_name || 'Player', dailyWins: wins };
  }).sort((a, b) => b.dailyWins - a.dailyWins).slice(0, 10);

  return json(res, {
    todayLeaderboard: leaderboardToday,
    mostDailyWinsThisWeek: weekWinners,
    mostDailyWinsThisMonth: monthWinners,
  });
}
