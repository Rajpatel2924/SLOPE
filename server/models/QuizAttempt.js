import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, unique: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  moduleIdx: { type: Number, required: true },
  topicIdx: { type: Number, required: true },
  topicTitle: { type: String, required: true },
  source: { type: String, required: true },
  score: { type: Number, required: true },
  correct: { type: Number, required: true },
  total: { type: Number, required: true },
  review: { type: [new mongoose.Schema({
    prompt: String, options: [String], selectedIndex: Number, correctIndex: Number, explanation: String,
  }, { _id: false })], required: true },
}, { timestamps: true });

attemptSchema.index({ userId: 1, roadmapId: 1, createdAt: -1 });
export default mongoose.model('QuizAttempt', attemptSchema);
