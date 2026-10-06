import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    resourceIds: {
      type: [String],
      required: true,
      default: [],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    weekStart: {
      type: Number,
      required: true,
      min: 1,
    },
    weekEnd: {
      type: Number,
      required: true,
      min: 1,
    },
    topics: {
      type: [topicSchema],
      required: true,
    },
  },
  { _id: false },
);

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    hoursPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    totalWeeks: {
      type: Number,
      required: true,
      min: 1,
      max: 26,
    },
    source: {
      type: String,
      enum: ['ai', 'fallback'],
      required: true,
    },
    modules: {
      type: [moduleSchema],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

roadmapSchema.index({ userId: 1, createdAt: -1 });

const Roadmap = mongoose.model('Roadmap', roadmapSchema);

export default Roadmap;
