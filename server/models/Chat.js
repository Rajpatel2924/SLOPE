import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 12000,
  },
  at: {
    type: Date,
    default: Date.now,
    required: true,
  },
}, { _id: false });

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
}, { timestamps: true });

chatSchema.pre('save', function capHistory() {
  this.messages = this.messages.slice(-50);
});

export default mongoose.model('Chat', chatSchema);
