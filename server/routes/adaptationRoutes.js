import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Roadmap from '../models/Roadmap.js';
import Adaptation from '../models/Adaptation.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getLatestRoadmap, expandRoadmapResources } from '../services/roadmapService.js';
import { adaptationEvidence, proposeAdaptation } from '../services/adaptationService.js';
import { objectIdSchema } from '../middleware/schemas.js';
import { httpError } from '../services/httpError.js';

const router = Router();
router.use(requireAuth);
const limiter = rateLimit({ windowMs: 15 * 60000, max: 30, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => req.user.id,
  handler: (req, res) => res.status(429).json({ error: { message: 'Too many roadmap previews. Try again in 15 minutes.', details: [] } }),
});

router.post('/preview', limiter, validate(z.object({ hoursPerWeek: z.number().int().min(1).max(60) }).strict()), async (req, res, next) => {
  try {
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap) throw httpError(404, 'Create a roadmap first.');
    const evidence = await adaptationEvidence(req.user, roadmap);
    const proposal = proposeAdaptation(roadmap, req.user.preferences, evidence, req.body.hoursPerWeek);
    if (proposal.totalWeeks > 156) throw httpError(400, 'This estimate exceeds 156 weeks. Increase your weekly availability or shorten your sessions.');
    const adaptation = await Adaptation.create({ userId: req.user._id, roadmapId: roadmap._id, baseVersion: roadmap.__v || 0,
      evidenceHash: evidence.hash, hoursPerWeek: req.body.hoursPerWeek, ...proposal,
      expiresAt: new Date(Date.now() + 30 * 60000) });
    return res.json({ id: adaptation.id, expiresAt: adaptation.expiresAt, ...proposal.summary });
  } catch (error) { return next(error); }
});

router.post('/:id/apply', validate(z.object({ id: objectIdSchema }), 'params'), async (req, res, next) => {
  try {
    const adaptation = await Adaptation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!adaptation) throw httpError(404, 'Roadmap preview not found.');
    if (adaptation.appliedAt || adaptation.expiresAt < new Date()) throw httpError(409, 'This preview was applied or expired. Create a new preview.');
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap || roadmap.id !== adaptation.roadmapId.toString()) throw httpError(409, 'Your active roadmap changed. Create a new preview.');
    const evidence = await adaptationEvidence(req.user, roadmap);
    if (evidence.hash !== adaptation.evidenceHash) throw httpError(409, 'Your progress, quiz results, or preferences changed. Create a fresh preview.');
    const updated = await Roadmap.findOneAndUpdate({ _id: roadmap._id, userId: req.user._id, __v: adaptation.baseVersion }, {
      $set: { modules: adaptation.modules, hoursPerWeek: adaptation.hoursPerWeek, totalWeeks: adaptation.totalWeeks, adaptedAt: new Date() },
      $inc: { __v: 1, scheduleVersion: 1 },
    }, { new: true, runValidators: true });
    if (!updated) throw httpError(409, 'Your roadmap changed. Create a fresh preview.');
    await Adaptation.updateOne({ _id: adaptation._id }, { $set: { appliedAt: new Date() } });
    return res.json({ roadmap: expandRoadmapResources(updated), message: 'Roadmap adjusted. Completed topics are preserved and daily tasks will use the new schedule.' });
  } catch (error) { return next(error); }
});

export default router;
