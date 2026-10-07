import nodemailer from 'nodemailer';
import { httpError } from './httpError.js';

function emailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const password = process.env.EMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  const from = process.env.EMAIL_FROM?.trim() || (user ? `SLOPE 2.0 <${user}>` : '');

  return { user, password, from };
}

export function emailConfigured() {
  const { user, password } = emailConfig();
  return Boolean(user && password);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textAsHtml(text) {
  return `<p>${escapeHtml(text).replaceAll('\n', '<br>')}</p>`;
}

export async function sendEmail({ to, subject, text, html }) {
  const { user, password, from } = emailConfig();
  if (!user || !password) {
    throw httpError(503, 'Email delivery is not configured. Please contact the site administrator.');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user,
        pass: password,
      },
    });
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || textAsHtml(text),
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email delivery failed:', {
      message: String(error?.message || 'Unknown email delivery error')
        .replaceAll(password, '[redacted]')
        .replaceAll(user, '[redacted]'),
      code: error?.code,
      responseCode: error?.responseCode,
    });

    throw httpError(503, 'Email could not be delivered. Please try again later.');
  }
}
