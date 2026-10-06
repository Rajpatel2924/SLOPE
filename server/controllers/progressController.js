import {
  calculateProgress,
  getLatestRoadmap,
} from '../services/roadmapService.js';

export async function getProgress(req, res, next) {
  try {
    const roadmap = await getLatestRoadmap(req.user._id);

    if (!roadmap) {
      const error = new Error('No roadmap found.');
      error.statusCode = 404;
      return next(error);
    }

    return res.json(calculateProgress(roadmap));
  } catch (error) {
    return next(error);
  }
}
