/**
 * Blushing Blooms — Stripe webhook to record successful payments.
 * Optional: requires STRIPE_WEBHOOK_SECRET. Records to Supabase bb35_orders when configured.
 */

import { getSupabase } from '../lib/db.js';
import { json, corsPreflight } from '../lib/res.js';

export const config = { api: { bodyParser: false } };

function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !stripeSecret || !sig) return json(res, { error: 'Webhook not configured' }, 400);

  const raw = await rawBody(req);
  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return json(res, { error: 'Stripe unavailable' }, 503);
  }

  let event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return json(res, { error: err.message }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.from('bb35_orders').insert({
          stripe_session_id: session.id,
          customer_email: session.customer_email || session.customer_details?.email,
          amount_total: session.amount_total ? session.amount_total / 100 : 0,
          status: 'paid'
        });
      } catch (e) {
        console.error('bb35 order insert error:', e);
      }
    }
  }

  return json(res, { received: true });
}
