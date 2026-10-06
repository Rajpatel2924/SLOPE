import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import {
  generateRoadmap,
  getRoadmap,
  toggleTopic,
} from '../controllers/roadmapController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdSchema } from '../middleware/schemas.js';

const router = Router();

const roadmapInputSchema = z.object({
  goal: z.string().trim().min(3, 'Goal must be at least 3 characters.').max(200),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
  totalWeeks: z.coerce.number().int().min(1).max(26),
}).strict();

const topicParamsSchema = z.object({
  moduleIdx: z.coerce.number().int().min(0).max(50),
  topicIdx: z.coerce.number().int().min(0).max(50),
}).strict();

const topicBodySchema = z.object({
  completed: z.boolean(),
  roadmapId: objectIdSchema.optional(),
}).strict();

const roadmapGenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  handler(req, res) {
    return res.status(429).json({
      error: {
        message: 'Too many roadmap generation requests. Try again later.',
        details: [],
      },
    });
  },
});

router.use(requireAuth);
router.post('/generate', roadmapGenerateLimiter, validate(roadmapInputSchema), generateRoadmap);
router.get('/', getRoadmap);
router.patch(
  '/topic/:moduleIdx/:topicIdx',
  validate(topicParamsSchema, 'params'),
  validate(topicBodySchema),
  toggleTopic,
);

export default router;
