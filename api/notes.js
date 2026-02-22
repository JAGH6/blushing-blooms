import { getSupabase } from '../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../lib/auth.js';
import { json, corsPreflight } from '../lib/res.js';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method === 'GET') {
    const date = req.query?.date || todayUtc();
    const onlyMine = req.query?.me === '1' || req.query?.me === 'true';
    const sb = getSupabase();
    if (!sb) return json(res, onlyMine ? { myNote: '' } : { date, notes: [] });
    if (onlyMine) {
      const token = getBearerFromRequest(req);
      const payload = verifyToken(token);
      if (!payload?.playerId) return json(res, { myNote: '' });
      const { data: row } = await sb.from('daily_notes').select('note_text').eq('player_id', payload.playerId).eq('date', date).single();
      return json(res, { date, myNote: row?.note_text ?? '' });
    }
    const { data: rows } = await sb
      .from('daily_notes')
      .select('note_text, created_at, players(display_name)')
      .eq('date', date)
      .order('created_at', { ascending: true });
    const notes = (rows || []).map((r) => ({
      displayName: r.players?.display_name || 'Player',
      noteText: r.note_text,
      createdAt: r.created_at,
    }));
    return json(res, { date, notes });
  }
  if (req.method === 'POST') {
    const token = getBearerFromRequest(req);
    const payload = verifyToken(token);
    if (!payload?.playerId) return json(res, { error: 'Unauthorized' }, 401);
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return json(res, { error: 'Invalid JSON' }, 400);
    }
    const noteText = String(body.noteText ?? '').trim().slice(0, 1000);
    const sb = getSupabase();
    if (!sb) return json(res, { error: 'Database not configured' }, 503);
    const date = todayUtc();
    const { error } = await sb.from('daily_notes').upsert(
      { player_id: payload.playerId, date, note_text: noteText, updated_at: new Date().toISOString() },
      { onConflict: 'player_id,date' }
    );
    if (error) return json(res, { error: 'Failed to save note' }, 500);
    return json(res, { ok: true });
  }
  return json(res, { error: 'Method not allowed' }, 405);
}
