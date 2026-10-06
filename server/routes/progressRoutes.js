import { Router } from 'express';
import { getProgress } from '../controllers/progressController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, getProgress);

export default router;
