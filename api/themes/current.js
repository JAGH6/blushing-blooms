import { getSupabase } from '../../lib/db.js';
import { json, corsPreflight } from '../../lib/res.js';

function weekStart(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  date.setUTCDate(diff);
  return date.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const sb = getSupabase();
  if (!sb) return json(res, { theme: null });

  const start = weekStart(new Date().toISOString());
  const { data: row } = await sb.from('weekly_themes').select('theme_key, label, config').eq('week_start_date', start).single();
  if (!row) return json(res, { theme: null });
  return json(res, { theme: { key: row.theme_key, label: row.label, config: row.config || {} } });
}
