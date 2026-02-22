import { getSupabase } from '../../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../../lib/auth.js';
import { json, corsPreflight } from '../../lib/res.js';

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
  const score = parseInt(body.score, 10) || 0;
  const levelReached = parseInt(body.levelReached, 10) || 1;
  const completionTimeSeconds = parseInt(body.completionTimeSeconds, 10) || 0;

  let feedbackText = 'Great run! Keep stacking those lines.';
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + openaiKey,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'In 1-2 short sentences, give encouraging Tetris feedback. Score: ' + score + ', Level reached: ' + levelReached + ', Time: ' + completionTimeSeconds + ' seconds. Be brief and positive.',
            },
          ],
          max_tokens: 80,
        }),
      });
      const data = r.ok ? await r.json() : null;
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content) feedbackText = content;
    } catch (_) {}
  }

  const sb = getSupabase();
  if (sb) {
    const date = todayUtc();
    await sb.from('game_feedback').upsert(
      { player_id: payload.playerId, date, feedback_text: feedbackText },
      { onConflict: 'player_id,date' }
    ).then(() => {}).catch(() => {});
  }

  return json(res, { feedback: feedbackText });
}
