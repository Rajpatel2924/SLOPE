import { httpError } from './httpError.js';

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export async function sendEmail({ to, subject, text, idempotencyKey }) {
  if (!emailConfigured()) {
    throw httpError(503, 'Email delivery is not configured. Please contact the site administrator.');
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM.trim(), to: [to], subject, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Email provider rejected the request.');
  } catch {
    throw httpError(503, 'Email could not be delivered. Please try again later.');
  }
}
