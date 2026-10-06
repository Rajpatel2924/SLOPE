import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getLatestRoadmap } from '../services/roadmapService.js';
import { httpError } from '../services/httpError.js';
import { buildQuiz, publicQuiz, publicAttempt } from '../services/quizService.js';
import { objectIdSchema } from '../middleware/schemas.js';

const router = Router();
router.use(requireAuth);
const limiter = rateLimit({ windowMs: 15 * 60000, max: 30, standardHeaders: 'draft-7', legacyHeaders: false, keyGenerator: (req) => req.user.id,
  handler: (req, res) => res.status(429).json({ error: { message: 'Too many quiz requests. Try again in 15 minutes.', details: [] } }),
});

router.get('/attempts', validate(z.object({ roadmapId: objectIdSchema.optional() }).strict(), 'query'), async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.find({ userId: req.user._id, ...(req.query.roadmapId ? { roadmapId: req.query.roadmapId } : {}) }).sort({ createdAt: -1, _id: -1 }).limit(100);
    return res.json({ attempts: attempts.map(publicAttempt) });
  } catch (error) { return next(error); }
});

router.post('/start', limiter, validate(z.object({ roadmapId: objectIdSchema, moduleIdx: z.number().int().min(0).max(50), topicIdx: z.number().int().min(0).max(50) }).strict()), async (req, res, next) => {
  try {
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap || roadmap.id !== req.body.roadmapId) throw httpError(409, 'Your active roadmap changed. Refresh and choose a topic again.');
    const topic = roadmap.modules[req.body.moduleIdx]?.topics[req.body.topicIdx];
    if (!topic) throw httpError(404, 'Topic not found.');
    const content = await buildQuiz(topic, roadmap.level);
    const quiz = await Quiz.create({ userId: req.user._id, ...req.body, topicTitle: topic.title, ...content, expiresAt: new Date(Date.now() + 24 * 60 * 60000) });
    return res.status(201).json({ quiz: publicQuiz(quiz) });
  } catch (error) { return next(error); }
});

router.get('/:id', validate(z.object({ id: objectIdSchema }), 'params'), async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) throw httpError(404, 'Quiz not found.');
    const attempt = await QuizAttempt.findOne({ quizId: quiz._id, userId: req.user._id });
    return res.json({ quiz: publicQuiz(quiz), attempt: attempt ? publicAttempt(attempt) : null });
  } catch (error) { return next(error); }
});

router.post('/:id/submit', limiter, validate(z.object({ id: objectIdSchema }), 'params'), validate(z.object({ answers: z.array(z.number().int().min(0).max(3)).min(5).max(10) }).strict()), async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) throw httpError(404, 'Quiz not found.');
    let attempt = await QuizAttempt.findOne({ quizId: quiz._id, userId: req.user._id });
    if (attempt) return res.json({ attempt: publicAttempt(attempt) });
    if (quiz.expiresAt < new Date()) throw httpError(400, 'This quiz expired. Start a new attempt.');
    const roadmap = await getLatestRoadmap(req.user._id);
    if (!roadmap || roadmap.id !== quiz.roadmapId.toString()) throw httpError(409, 'Your roadmap changed. Start a quiz on the active roadmap.');
    if (req.body.answers.length !== quiz.questions.length) throw httpError(400, 'Answer every question before submitting.');
    const review = quiz.questions.map((question, index) => ({ ...question.toObject(), selectedIndex: req.body.answers[index] }));
    const correct = review.filter((question) => question.selectedIndex === question.correctIndex).length;
    try {
      attempt = await QuizAttempt.create({ userId: req.user._id, quizId: quiz._id, roadmapId: quiz.roadmapId,
        moduleIdx: quiz.moduleIdx, topicIdx: quiz.topicIdx, topicTitle: quiz.topicTitle, source: quiz.source,
        correct, total: review.length, score: Math.round(correct / review.length * 100), review });
    } catch (error) {
      if (error.code !== 11000) throw error;
      attempt = await QuizAttempt.findOne({ quizId: quiz._id, userId: req.user._id });
    }
    return res.json({ attempt: publicAttempt(attempt) });
  } catch (error) { return next(error); }
});

export default router;
