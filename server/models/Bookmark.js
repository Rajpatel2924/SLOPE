import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resourceId: { type: String, required: true },
}, { timestamps: true });

bookmarkSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
export default mongoose.model('Bookmark', bookmarkSchema);
