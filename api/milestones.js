import { getSupabase } from '../lib/db.js';
import { json, corsPreflight } from '../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const sb = getSupabase();
  if (!sb) return json(res, { milestones: [] });

  const { data: rows } = await sb.from('milestones').select('milestone_key, unlocked_at').order('unlocked_at', { ascending: false });
  const milestones = (rows || []).map((r) => ({ key: r.milestone_key, unlockedAt: r.unlocked_at }));
  return json(res, { milestones });
}
