import Roadmap from '../models/Roadmap.js';
import { httpError } from '../services/httpError.js';
import {
  buildRoadmap,
  calculateProgress,
  expandRoadmapResources,
  getLatestRoadmap,
} from '../services/roadmapService.js';

function notFoundError(message = 'No roadmap found.') {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

export async function generateRoadmap(req, res, next) {
  try {
    const result = await buildRoadmap(req.body);
    const roadmap = await Roadmap.create({
      userId: req.user._id,
      ...req.body,
      ...result,
    });

    return res.status(201).json({
      roadmap: expandRoadmapResources(roadmap),
      notice: result.source === 'fallback'
        ? 'We created a curated fallback roadmap because AI generation was unavailable.'
        : null,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getRoadmap(req, res, next) {
  try {
    const roadmap = await getLatestRoadmap(req.user._id);

    if (!roadmap) {
      return next(notFoundError());
    }

    return res.json({ roadmap: expandRoadmapResources(roadmap) });
  } catch (error) {
    return next(error);
  }
}

export async function toggleTopic(req, res, next) {
  try {
    const roadmap = await getLatestRoadmap(req.user._id);

    if (!roadmap) {
      return next(notFoundError());
    }
    if (req.body.roadmapId && req.body.roadmapId !== roadmap.id) {
      throw httpError(409, 'Your active roadmap changed. Refresh before updating a topic.');
    }

    const { moduleIdx, topicIdx } = req.params;
    const module = roadmap.modules[Number(moduleIdx)];
    const topic = module?.topics[Number(topicIdx)];

    if (!topic) {
      const error = new Error('Topic was not found.');
      error.statusCode = 404;
      return next(error);
    }

    const updated = await Roadmap.findOneAndUpdate({ _id: roadmap._id, userId: req.user._id }, {
      $set: {
        [`modules.${moduleIdx}.topics.${topicIdx}.completed`]: req.body.completed,
        [`modules.${moduleIdx}.topics.${topicIdx}.completedAt`]: req.body.completed ? new Date() : null,
      }, $inc: { __v: 1 },
    }, { new: true });

    return res.json({ progress: calculateProgress(updated) });
  } catch (error) {
    return next(error);
  }
}
