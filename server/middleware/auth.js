import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

function authError(message = 'Authentication required.') {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

export async function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('Authentication is not configured.');
    error.statusCode = 500;
    return next(error);
  }

  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(authError());
  }

  let payload;

  try {
    payload = jwt.verify(token, secret);
  } catch (error) {
    return next(authError('Invalid or expired token.'));
  }

  if (!payload || typeof payload !== 'object' || !mongoose.isObjectIdOrHexString(payload.sub)) {
    return next(authError('Invalid or expired token.'));
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user || (payload.version || 0) !== (user.tokenVersion || 0)) {
      return next(authError('Invalid or expired token.'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
