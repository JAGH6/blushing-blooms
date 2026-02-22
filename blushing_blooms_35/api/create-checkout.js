/**
 * Blushing Blooms — create Stripe Checkout Session for cart.
 * Requires STRIPE_SECRET_KEY. If not set, returns 503 so the front can show "contact us to complete order".
 */

import { json, corsPreflight } from '../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return json(res, { error: 'Checkout is not configured yet. Please complete your order via the Contact page.' }, 503);
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  const { lineItems, successUrl, cancelUrl, customerEmail } = body;
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return json(res, { error: 'Cart is empty' }, 400);
  }

  let Stripe;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return json(res, { error: 'Payment system unavailable' }, 503);
  }

  const stripe = new Stripe(secret);
  const origin = req.headers.origin || '';

  const sessionConfig = {
    mode: 'payment',
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : undefined
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: item.quantity || 1
    })),
    success_url: successUrl || `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${origin}/shop`
  };

  if (customerEmail) sessionConfig.customer_email = customerEmail;

  try {
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return json(res, { url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return json(res, { error: err.message || 'Payment session failed' }, 500);
  }
}
