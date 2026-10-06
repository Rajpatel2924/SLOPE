import mongoose from 'mongoose';

const adaptationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  baseVersion: { type: Number, required: true },
  evidenceHash: { type: String, required: true },
  hoursPerWeek: { type: Number, required: true },
  totalWeeks: { type: Number, required: true },
  modules: { type: mongoose.Schema.Types.Mixed, required: true },
  summary: { type: mongoose.Schema.Types.Mixed, required: true },
  expiresAt: { type: Date, required: true },
  appliedAt: Date,
}, { timestamps: true });

export default mongoose.model('Adaptation', adaptationSchema);
