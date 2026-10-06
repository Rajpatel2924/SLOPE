import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  explanation: { type: String, required: true },
}, { _id: false });

const quizSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  moduleIdx: { type: Number, required: true },
  topicIdx: { type: Number, required: true },
  topicTitle: { type: String, required: true },
  source: { type: String, enum: ['ai', 'curated'], required: true },
  focus: { type: String, required: true },
  questions: { type: [questionSchema], required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);
