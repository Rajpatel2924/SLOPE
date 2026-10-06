import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { runReminderBatch } from '../services/reminderService.js';

try {
  await connectDB();
  console.log(JSON.stringify(await runReminderBatch()));
} catch {
  console.error('Reminder run failed. Check database and email configuration.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
