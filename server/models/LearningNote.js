import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  moduleIdx: { type: Number, required: true },
  topicIdx: { type: Number, required: true },
  topicTitle: { type: String, required: true },
  content: { type: String, required: true, maxlength: 6000 },
}, { timestamps: true });

noteSchema.index({ userId: 1, roadmapId: 1, moduleIdx: 1, topicIdx: 1 }, { unique: true });
export default mongoose.model('LearningNote', noteSchema);
