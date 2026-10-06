import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getChatHistory, sendMessage } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const messageSchema = z.object({
  message: z.string().trim()
    .min(1, 'Enter a message before sending.')
    .max(2000, 'Keep your question under 2,000 characters.'),
}).strict();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  handler(req, res) {
    return res.status(429).json({
      error: {
        message: 'Too many study assistant questions. Please try again later.',
        details: [],
      },
    });
  },
});

router.use(requireAuth);
router.get('/', getChatHistory);
router.post('/', chatLimiter, validate(messageSchema), sendMessage);

export default router;
