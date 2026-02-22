/**
 * Blushing Blooms — contact form submission.
 * Stores in Supabase table bb35_contact_submissions when configured; otherwise returns success so the form can be tested.
 */

import { getSupabase } from '../../lib/db.js';
import { json, corsPreflight } from '../../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() || 'general' : 'general';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email || !message) {
    return json(res, { error: 'Name, email, and message are required' }, 400);
  }

  if (message.length > 5000) {
    return json(res, { error: 'Message is too long' }, 400);
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('bb35_contact_submissions').insert({
        name,
        email,
        subject,
        message
      });
      if (error) throw error;
    } catch (err) {
      console.error('bb35 contact insert error:', err);
      return json(res, { error: 'Could not save message. Please try again or reach out on Instagram.' }, 500);
    }
  }

  return json(res, { success: true });
}
