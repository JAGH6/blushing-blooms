import { getSupabase } from '../lib/db.js';
import { verifyToken, getBearerFromRequest } from '../lib/auth.js';
import { json, corsPreflight } from '../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  const token = getBearerFromRequest(req);
  const payload = verifyToken(token);
  if (!payload?.playerId) return json(res, { error: 'Unauthorized' }, 401);
  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  if (req.method === 'GET') {
    const { data: player, error } = await sb.from('players').select('id, display_name, avatar_url, theme').eq('id', payload.playerId).single();
    if (error || !player) return json(res, { error: 'Player not found' }, 404);
    return json(res, { id: player.id, display_name: player.display_name, avatar_url: player.avatar_url || null, theme: player.theme || 'classic' });
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return json(res, { error: 'Invalid JSON' }, 400);
    }
    const updates = {};
    if (body.avatar_url !== undefined) updates.avatar_url = String(body.avatar_url).trim().slice(0, 500) || null;
    if (body.theme !== undefined) updates.theme = String(body.theme).trim().slice(0, 50) || 'classic';
    if (Object.keys(updates).length === 0) return json(res, { error: 'Nothing to update' }, 400);
    const { data: player, error } = await sb.from('players').update(updates).eq('id', payload.playerId).select('id, display_name, avatar_url, theme').single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, player);
  }

  return json(res, { error: 'Method not allowed' }, 405);
}
