import { Router } from 'express';
import { z } from 'zod';
import { getResources } from '../services/resourceService.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const resourceQuerySchema = z.object({
  topic: z.string().trim().min(1).max(100).optional(),
}).strict();

router.get('/', validate(resourceQuerySchema, 'query'), (req, res) => {
  res.json({ resources: getResources(req.query.topic) });
});

export default router;
