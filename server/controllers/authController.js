import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw httpError(500, 'Authentication is not configured.');
  }

  return jwt.sign(
    { sub: user._id.toString() },
    secret,
    { expiresIn: '7d' },
  );
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
