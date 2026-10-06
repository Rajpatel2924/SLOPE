import mongoose from 'mongoose';

let lastConnectionError = null;

export async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not configured.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    // Unique email/chat indexes must exist before accepting requests.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    lastConnectionError = null;
    console.log('MongoDB connected.');
    return mongoose.connection;
  } catch (error) {
    lastConnectionError = error;
    throw error;
  }
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    configured: Boolean(process.env.MONGO_URI),
    state: states[mongoose.connection.readyState] || 'unknown',
    connectionError: lastConnectionError ? 'connection_failed' : null,
  };
}

export async function checkDatabaseHealth() {
  const status = getDatabaseStatus();
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return { ...status, ready: false };
  }

  try {
    // A bounded ping catches outages before Mongoose updates its connection state.
    await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 2000 });
    return { ...getDatabaseStatus(), ready: true };
  } catch {
    return { ...getDatabaseStatus(), ready: false, connectionError: 'ping_failed' };
  }
}
