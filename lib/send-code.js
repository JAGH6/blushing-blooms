/**
 * Send one-time code via email (Resend) or SMS (Twilio).
 * Env: RESEND_API_KEY + RESEND_FROM for email; TWILIO_* for SMS.
 */

function isPhone(value) {
  return /^\+?[\d\s-]{10,}$/.test(String(value).trim());
}

export async function sendCode(emailOrPhone, code) {
  const trimmed = String(emailOrPhone).trim();
  if (isPhone(trimmed)) {
    return sendSms(trimmed, code);
  }
  return sendEmail(trimmed, code);
}

async function sendEmail(email, code) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Tetris <onboarding@resend.dev>';
  if (!key) {
    console.warn('RESEND_API_KEY not set; skipping email.');
    return { ok: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Tetris Family Competition code',
      text: `Your code is: ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Email send failed: ' + err);
  }
  return { ok: true };
}

async function sendSms(phone, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.warn('Twilio not configured; skipping SMS.');
    return { ok: true };
  }
  const to = phone.replace(/\D/g, '');
  const body = `Your Tetris code: ${code}. Expires in 10 min.`;
  const auth = Buffer.from(accountSid + ':' + authToken).toString('base64');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + auth,
      },
      body: new URLSearchParams({ To: to.startsWith('+') ? to : '+' + to, From: from, Body: body }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('SMS send failed: ' + (err.message || res.statusText));
  }
  return { ok: true };
}
