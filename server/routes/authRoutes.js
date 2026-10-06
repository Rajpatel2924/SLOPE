import { Router } from 'express';
import { z } from 'zod';
import {
  getMe,
  login,
  logout,
  register,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().trim().min(8, 'Password must be at least 8 characters.').max(128),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().trim().min(1, 'Password is required.').max(128),
}).strict();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
