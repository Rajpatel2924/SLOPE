import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { checkDatabaseHealth, connectDB } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const nodeEnv = process.env.NODE_ENV || 'development';
const configuredClientUrl = (process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
const allowedOrigins = new Set([
  configuredClientUrl,
  ...(nodeEnv !== 'production' ? ['http://localhost:5173'] : []),
].filter(Boolean));

app.disable('x-powered-by');
// Render terminates HTTPS at its reverse proxy.
if (nodeEnv === 'production') app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error('Origin is not allowed by CORS.');
    error.statusCode = 403;
    return callback(error);
  },
}));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', async (req, res) => {
  const database = await checkDatabaseHealth();
  res.set('Cache-Control', 'no-store');
  res.status(database.ready ? 200 : 503).json({
    status: database.ready ? 'ok' : 'unavailable',
    service: 'slope-server',
    database,
    timestamp: new Date().toISOString(),
    ...(!database.ready ? {
      error: { message: 'Database is unavailable.', details: [] },
    } : {}),
  });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(req, res) {
    return res.status(429).json({
      error: {
        message: 'Too many authentication requests. Try again later.',
        details: [],
      },
    });
  },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chat', chatRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  if (nodeEnv === 'production') {
    const missing = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']
      .filter((key) => !process.env[key]?.trim());
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}.`);
    if (process.env.JWT_SECRET.trim().length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters in production.');
    }
    let origin;
    try { origin = new URL(configuredClientUrl); } catch { /* Rejected below. */ }
    if (!origin || !['http:', 'https:'].includes(origin.protocol)
      || origin.origin !== configuredClientUrl) {
      throw new Error('CLIENT_URL must be a single HTTP(S) origin without a path, query, or credentials.');
    }
  }

  if (process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch {
      if (nodeEnv === 'production') {
        throw new Error('MongoDB connection or index initialization failed. Check Atlas access and MONGO_URI.');
      }
      console.error('MongoDB connection failed. The API will start with an unavailable health status.');
    }
  } else {
    console.warn('MONGO_URI is not configured. Database-backed routes will not work yet.');
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`SLOPE API listening on port ${port}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (nodeEnv !== 'test') {
  startServer().catch(async (error) => {
    console.error(`Server startup failed: ${error.message}`);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}

export default app;
