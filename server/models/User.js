import mongoose from 'mongoose';

const preferencesSchema = new mongoose.Schema({
  timezone: { type: String, default: 'Asia/Kolkata' },
  studyDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  sessionMinutes: { type: Number, default: 45, min: 15, max: 180 },
  reminderEnabled: { type: Boolean, default: false },
  reminderTime: { type: String, default: '18:00' },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model('User', userSchema);

export default User;
