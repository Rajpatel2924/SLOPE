import { Router } from 'express';
import { z } from 'zod';
import {
  getMe,
  login,
  logout,
  register,
  forgotPassword,
  resetPassword,
  updateAccount,
  changePassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const newPasswordSchema = z.string().trim().min(8, 'Password must be at least 8 characters.')
  .max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must fit within 72 UTF-8 bytes.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(50),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: newPasswordSchema,
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().trim().min(1, 'Password is required.').max(128),
}).strict();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', validate(z.object({ email: loginSchema.shape.email }).strict()), forgotPassword);
router.post('/reset-password', validate(z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/), password: newPasswordSchema,
}).strict()), resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/account', requireAuth, validate(z.object({
  name: registerSchema.shape.name,
  preferences: z.object({
    timezone: z.string().max(100).refine((value) => {
      try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
    }, 'Choose a valid timezone.'),
    studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
      .refine((days) => new Set(days).size === days.length, 'Study days must be unique.'),
    sessionMinutes: z.number().int().min(15).max(180),
    reminderEnabled: z.boolean(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }).strict(),
}).strict()), updateAccount);
router.post('/change-password', requireAuth, validate(z.object({
  currentPassword: loginSchema.shape.password, password: newPasswordSchema,
}).strict()), changePassword);
router.post('/logout', requireAuth, logout);

export default router;
