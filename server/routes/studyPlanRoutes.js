import { Router } from 'express';
import { z } from 'zod';
import Roadmap from '../models/Roadmap.js';
import StudyPlan from '../models/StudyPlan.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getStudyPlan, localDate, planResponse, addDays, preferencesKey } from '../services/studyPlanService.js';
import { getLatestRoadmap } from '../services/roadmapService.js';
import { httpError } from '../services/httpError.js';
import { dateSchema, objectIdSchema } from '../middleware/schemas.js';
const router = Router();
router.use(requireAuth);

router.get('/', validate(z.object({ date: dateSchema.optional() }).strict(), 'query'), async (req, res, next) => {
  try { return res.json((await getStudyPlan(req.user, req.query.date)).response); }
  catch (error) { return next(error); }
});

router.get('/upcoming', async (req, res, next) => {
  try {
    const today = localDate(new Date(), req.user.preferences.timezone);
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap) throw httpError(404, 'Create a roadmap first.');
    return res.json({ days: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index);
      const isStudyDay = req.user.preferences.studyDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
      return { date, budgetMinutes: isStudyDay ? Math.floor(roadmap.hoursPerWeek * 60 / req.user.preferences.studyDays.length) : 0 };
    }) });
  } catch (error) { return next(error); }
});

router.patch('/:planId/tasks/:taskId', validate(z.object({ planId: objectIdSchema, taskId: objectIdSchema }), 'params'), validate(z.object({ completed: z.boolean() }).strict()), async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.planId, userId: req.user._id });
    if (!plan) throw httpError(404, 'Study plan not found.');
    const task = plan.tasks.id(req.params.taskId);
    if (!task) throw httpError(404, 'Study task not found.');
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap || !roadmap._id.equals(plan.roadmapId) || (roadmap.scheduleVersion || 0) !== plan.scheduleVersion || plan.preferencesKey !== preferencesKey(req.user.preferences)) throw httpError(409, 'Your roadmap schedule or preferences changed. Refresh your daily plan.');
    if (plan.date > localDate(new Date(), req.user.preferences.timezone)) throw httpError(400, 'Future study tasks cannot be completed yet.');
    const topicPath = `modules.${task.moduleIdx}.topics.${task.topicIdx}`;
    const fields = task.kind === 'review'
      ? { [`${topicPath}.reviewRequired`]: !req.body.completed }
      : { [`${topicPath}.completed`]: req.body.completed, [`${topicPath}.completedAt`]: req.body.completed ? new Date() : null };
    const scheduleFilter = roadmap.scheduleVersion
      ? { scheduleVersion: roadmap.scheduleVersion }
      : { $or: [{ scheduleVersion: 0 }, { scheduleVersion: { $exists: false } }] };
    const updated = await Roadmap.findOneAndUpdate({ _id: roadmap._id, userId: req.user._id, ...scheduleFilter }, { $set: fields, $inc: { __v: 1 } }, { new: true });
    if (!updated) throw httpError(409, 'Your roadmap schedule changed. Refresh your daily plan.');
    return res.json(planResponse(plan, updated));
  } catch (error) { return next(error); }
});

export default router;
