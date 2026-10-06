import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  message: { type: String, required: true },
  readAt: Date,
  emailSentAt: Date,
  attempts: { type: Number, default: 0 },
  lockUntil: Date,
  nextAttemptAt: Date,
}, { timestamps: true });

reminderSchema.index({ userId: 1, date: 1 }, { unique: true });
export default mongoose.model('Reminder', reminderSchema);
