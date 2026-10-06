import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  moduleIdx: { type: Number, required: true },
  topicIdx: { type: Number, required: true },
  title: { type: String, required: true },
  kind: { type: String, enum: ['study', 'review'], default: 'study' },
  minutes: { type: Number, required: true, min: 1 },
  carriedFrom: String,
});

const studyPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  date: { type: String, required: true },
  scheduleVersion: { type: Number, default: 0 },
  preferencesKey: { type: String, required: true },
  forecast: { type: Boolean, default: false },
  timezone: { type: String, required: true },
  budgetMinutes: { type: Number, required: true },
  tasks: { type: [taskSchema], default: [] },
}, { timestamps: true });

studyPlanSchema.index({ userId: 1, roadmapId: 1, date: 1, scheduleVersion: 1, preferencesKey: 1 }, { unique: true });
export default mongoose.model('StudyPlan', studyPlanSchema);
