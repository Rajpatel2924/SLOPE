import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import { httpError } from '../services/httpError.js';
import { emailConfigured, sendEmail } from '../services/emailService.js';

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    preferences: user.preferences,
  };
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw httpError(500, 'Authentication is not configured.');
  }

  return jwt.sign(
    { sub: user._id.toString(), version: user.tokenVersion || 0 },
    secret,
    { expiresIn: '7d' },
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.exists({ email });

    if (existingUser) {
      return next(httpError(409, 'An account with this email already exists.'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = createToken(user);

    return res.status(201).json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return next(httpError(409, 'An account with this email already exists.'));
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      return next(httpError(401, 'Invalid email or password.'));
    }

    return res.json({
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export function getMe(req, res) {
  return res.json({ user: publicUser(req.user) });
}

export function logout(req, res) {
  return res.json({
    message: 'Logged out. Remove the token from the client.',
  });
}

export async function forgotPassword(req, res, next) {
  try {
    const canPreview = ['development', 'test'].includes(process.env.NODE_ENV || 'development');
    if (!emailConfigured() && !canPreview) {
      throw httpError(503, 'Password recovery email is not configured. Please contact the site administrator.');
    }
    const user = await User.findOne({ email: req.body.email });
    const response = { message: 'If that email has an account, a reset link will be sent. It expires in 30 minutes.' };
    if (user) {
      const token = randomBytes(32).toString('hex');
      const hash = createHash('sha256').update(token).digest('hex');
      await User.updateOne({ _id: user._id }, {
        $set: { resetTokenHash: hash, resetTokenExpiresAt: new Date(Date.now() + 30 * 60000) },
      });
      const resetUrl = new URL('/reset-password', process.env.CLIENT_URL || 'http://localhost:5173');
      // Fragments do not reach server access logs or outgoing Referer headers.
      resetUrl.hash = `token=${token}`;
      if (!emailConfigured() && canPreview) response.previewUrl = resetUrl.toString();
      else {
        try {
          const resetUrlText = resetUrl.toString();
          await sendEmail({
            to: user.email,
            subject: 'Reset your SLOPE 2.0 password',
            text: `SLOPE 2.0\n\nReset your password\n\nWe received a request to reset the password for your SLOPE 2.0 account.\n\nUse the link below to create a new password:\n\n${resetUrlText}\n\nThis link expires in 30 minutes.\n\nIf you did not request a password reset, you can safely ignore this email.`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172554;max-width:600px;margin:0 auto;padding:24px"><p style="font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4f46e5">SLOPE 2.0</p><h1 style="font-size:28px;margin:16px 0 8px">Reset your password</h1><p>We received a request to reset the password for your SLOPE 2.0 account.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrlText)}" style="background:#4f46e5;border-radius:8px;color:#fff;display:inline-block;padding:12px 20px;text-decoration:none;font-weight:700">Reset your password</a></p><p>This link expires in <strong>30 minutes</strong>.</p><p>If the button does not work, copy and paste this URL into your browser:</p><p style="word-break:break-all"><a href="${escapeHtml(resetUrlText)}">${escapeHtml(resetUrlText)}</a></p><p style="color:#475569">If you did not request a password reset, you can safely ignore this email.</p></div>`,
          });
        } catch {
          await User.updateOne({ _id: user._id, resetTokenHash: hash }, {
            $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
          });
          // Keep the response identical for registered and unregistered addresses.
          console.error('Password recovery email delivery failed.');
        }
      }
    }
    return res.json(response);
  } catch (error) { return next(error); }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate({
      resetTokenHash: createHash('sha256').update(token).digest('hex'),
      resetTokenExpiresAt: { $gt: new Date() },
    }, {
      $set: { passwordHash },
      $inc: { tokenVersion: 1 },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
    });
    if (!user) throw httpError(400, 'This reset link is invalid or expired. Request a new link.');
    return res.json({ message: 'Password reset. Sign in with your new password.' });
  } catch (error) { return next(error); }
}

export async function updateAccount(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: req.body }, {
      new: true, runValidators: true,
    });
    if (!user) throw httpError(404, 'Account not found.');
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
}

export async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!await bcrypt.compare(req.body.currentPassword, user.passwordHash)) {
      throw httpError(400, 'Your current password is incorrect.');
    }
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const updated = await User.findOneAndUpdate({ _id: user._id, passwordHash: user.passwordHash }, {
      $set: { passwordHash }, $inc: { tokenVersion: 1 },
      $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
    }, { new: true });
    if (!updated) throw httpError(409, 'Your password changed in another session. Sign in again.');
    return res.json({ token: createToken(updated), user: publicUser(updated), message: 'Password changed. Other sessions have been signed out.' });
  } catch (error) { return next(error); }
}
