import { getSupabase } from '../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../lib/auth.js';
import { json, corsPreflight } from '../lib/res.js';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  const token = getBearerFromRequest(req);
  const payload = verifyToken(token);
  if (!payload?.playerId) return json(res, { error: 'Unauthorized' }, 401);

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  let score = parseInt(body.score, 10);
  const completionTimeSeconds = parseInt(body.completionTimeSeconds, 10);
  const levelReached = Math.min(10, Math.max(1, parseInt(body.levelReached, 10) || 1));
  const selectedOptionText = typeof body.selectedOptionText === 'string' ? body.selectedOptionText.trim() : null;
  if (Number.isNaN(score) || score < 0 || Number.isNaN(completionTimeSeconds) || completionTimeSeconds < 0) {
    return json(res, { error: 'Invalid score or time' }, 400);
  }

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const date = todayUtc();
  const TRIVIA_BONUS = 100;
  let triviaBonusEarned = false;
  if (selectedOptionText) {
    const { data: triviaRow } = await sb.from('daily_trivia').select('options, correct_index').eq('date', date).single();
    let correctAnswerText = null;
    if (triviaRow && Array.isArray(triviaRow.options) && triviaRow.correct_index >= 0) {
      correctAnswerText = triviaRow.options[triviaRow.correct_index];
    } else {
      const fallback = getFallbackTriviaCorrect(date);
      if (fallback) correctAnswerText = fallback;
    }
    if (correctAnswerText && selectedOptionText === correctAnswerText) {
      score += TRIVIA_BONUS;
      triviaBonusEarned = true;
    }
  }

  const { data: existing } = await sb
    .from('daily_scores')
    .select('id, score, completion_time_seconds')
    .eq('player_id', payload.playerId)
    .eq('date', date)
    .single();

  if (existing) {
    const better = score > existing.score || (score === existing.score && completionTimeSeconds < existing.completion_time_seconds);
    if (!better) {
      const { data: leaderboard } = await sb.from('daily_scores').select(`
        score, completion_time_seconds, level_reached,
        players(display_name)
      `).eq('date', date).order('score', { ascending: false }).order('completion_time_seconds', { ascending: true });
      return json(res, { submitted: false, alreadyPlayed: true, leaderboard: formatLeaderboard(leaderboard) });
    }
    await sb.from('daily_scores').update({
      score,
      completion_time_seconds: completionTimeSeconds,
      level_reached: levelReached,
      trivia_bonus_earned: triviaBonusEarned,
      updated_at: new Date().toISOString(),
    }).eq('player_id', payload.playerId).eq('date', date);
  } else {
    const { error: insErr } = await sb.from('daily_scores').insert({
      player_id: payload.playerId,
      date,
      score,
      completion_time_seconds: completionTimeSeconds,
      level_reached: levelReached,
      trivia_bonus_earned: triviaBonusEarned,
    });
    if (insErr) return json(res, { error: 'Failed to save score' }, 500);
  }

  await updateStreak(sb, payload.playerId, date);
  await grantAchievements(sb, payload.playerId, score, levelReached);

  const { data: leaderboard } = await sb.from('daily_scores').select(`
    score, completion_time_seconds, level_reached,
    players(display_name)
  `).eq('date', date).order('score', { ascending: false }).order('completion_time_seconds', { ascending: true });

  return json(res, { submitted: true, leaderboard: formatLeaderboard(leaderboard || []) });
}

function formatLeaderboard(rows) {
  return rows.map((r, i) => ({
    rank: i + 1,
    displayName: r.players?.display_name || 'Player',
    score: r.score,
    completionTimeSeconds: r.completion_time_seconds,
    levelReached: r.level_reached,
  }));
}

function getFallbackTriviaCorrect(date) {
  const seed = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = [
    ['1984', '1989', '1992', '1979', '1986', '1990'],
    ['5', '6', '7', '8', '4', '9'],
    ['Space', 'Up arrow', 'Enter', 'Shift', 'Tab', 'Ctrl'],
    ['Tetris', 'Quad', 'Super', 'Mega', 'Clear', 'Line'],
    ['USA', 'Japan', 'Russia', 'UK', 'Germany', 'China'],
  ];
  const correctIndices = [0, 2, 1, 0, 2];
  const i = seed % pool.length;
  return pool[i][correctIndices[i]];
}

function yesterday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function updateStreak(sb, playerId, date) {
  const { data: row } = await sb.from('player_streaks').select('current_streak, longest_streak, last_played_date').eq('player_id', playerId).single();
  let current = row?.current_streak ?? 0;
  let longest = row?.longest_streak ?? 0;
  const last = row?.last_played_date;
  const prev = yesterday(date);
  if (last === prev) current += 1;
  else if (last !== date) current = 1;
  if (current > longest) longest = current;
  await sb.from('player_streaks').upsert(
    { player_id: playerId, current_streak: current, longest_streak: longest, last_played_date: date, updated_at: new Date().toISOString() },
    { onConflict: 'player_id' }
  );
}

async function grantAchievements(sb, playerId, score, levelReached) {
  const keys = [];
  if (levelReached >= 10) keys.push('beat_level_10');
  if (score >= 50000) keys.push('high_scorer');
  const { data: existing } = await sb.from('achievements').select('achievement_key').eq('player_id', playerId);
  const have = new Set((existing || []).map((r) => r.achievement_key));
  const { data: streakRow } = await sb.from('player_streaks').select('current_streak').eq('player_id', playerId).single();
  if (streakRow && streakRow.current_streak >= 3 && !have.has('streak_3')) keys.push('streak_3');
  if (streakRow && streakRow.current_streak >= 7 && !have.has('streak_7')) keys.push('streak_7');
  const { count } = await sb.from('daily_scores').select('*', { count: 'exact', head: true }).eq('player_id', playerId);
  if (count === 1 && !have.has('first_play')) keys.push('first_play');
  for (const key of keys) {
    if (have.has(key)) continue;
    await sb.from('achievements').insert({ player_id: playerId, achievement_key: key }).then(() => {}).catch(() => {});
  }
}
