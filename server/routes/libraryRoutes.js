import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import Roadmap from '../models/Roadmap.js';
import LearningNote from '../models/LearningNote.js';
import Bookmark from '../models/Bookmark.js';
import Reminder from '../models/Reminder.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdSchema } from '../middleware/schemas.js';
import { httpError } from '../services/httpError.js';
import { getResourceById } from '../services/resourceService.js';
import { deliverDueReminder, runReminderBatch } from '../services/reminderService.js';
import { emailConfigured } from '../services/emailService.js';

const router = Router();
const topicReference = z.object({ roadmapId: objectIdSchema, moduleIdx: z.coerce.number().int().min(0).max(50), topicIdx: z.coerce.number().int().min(0).max(50) }).strict();
const searchSchema = z.object({ search: z.string().trim().max(100).optional() }).strict();
const publicNote = (note) => ({ id: note.id, roadmapId: note.roadmapId.toString(), moduleIdx: note.moduleIdx, topicIdx: note.topicIdx, topicTitle: note.topicTitle, content: note.content, updatedAt: note.updatedAt });

router.post('/reminders/run', async (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const supplied = (req.get('authorization') || '').replace(/^Bearer /, '');
  if (!req.get('authorization')?.startsWith('Bearer ') || !secret || secret.length < 32 || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return res.status(401).json({ error: { message: 'Invalid scheduler credentials.', details: [] } });
  }
  try { return res.json(await runReminderBatch()); }
  catch (error) { return next(error); }
});

router.use(requireAuth);

async function ownedTopic(userId, reference) {
  const roadmap = await Roadmap.findOne({ _id: reference.roadmapId, userId });
  const topic = roadmap?.modules[reference.moduleIdx]?.topics[reference.topicIdx];
  if (!topic) throw httpError(404, 'Topic not found.');
  return topic;
}

router.get('/notes/topic', validate(topicReference, 'query'), async (req, res, next) => {
  try {
    const topic = await ownedTopic(req.user._id, req.query);
    const note = await LearningNote.findOne({ userId: req.user._id, ...req.query });
    return res.json({ topicTitle: topic.title, note: note ? publicNote(note) : null });
  } catch (error) { return next(error); }
});

router.put('/notes/topic', validate(topicReference.extend({
  content: z.string().trim().min(1, 'Write a note before saving.').max(6000)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 8000, 'Keep the note under 8KB.'),
}).strict()), async (req, res, next) => {
  try {
    const { content, ...reference } = req.body;
    const topic = await ownedTopic(req.user._id, reference);
    let note;
    try {
      note = await LearningNote.findOneAndUpdate({ userId: req.user._id, ...reference }, { $set: { content, topicTitle: topic.title } }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      note = await LearningNote.findOneAndUpdate({ userId: req.user._id, ...reference }, { $set: { content, topicTitle: topic.title } }, { new: true, runValidators: true });
    }
    return res.json({ note: publicNote(note) });
  } catch (error) { return next(error); }
});

router.get('/notes', validate(searchSchema, 'query'), async (req, res, next) => {
  try {
    const escaped = req.query.search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const notes = await LearningNote.find({ userId: req.user._id, ...(escaped ? { $or: [{ topicTitle: new RegExp(escaped, 'i') }, { content: new RegExp(escaped, 'i') }] } : {}) }).sort({ updatedAt: -1, _id: -1 }).limit(100);
    return res.json({ notes: notes.map(publicNote) });
  } catch (error) { return next(error); }
});

router.delete('/notes/:id', validate(z.object({ id: objectIdSchema }), 'params'), async (req, res, next) => {
  try {
    const note = await LearningNote.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!note) throw httpError(404, 'Note not found.');
    return res.json({ message: 'Note deleted.' });
  } catch (error) { return next(error); }
});

router.get('/bookmarks', async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    return res.json({ bookmarks: bookmarks.map((bookmark) => ({ id: bookmark.id, resource: getResourceById(bookmark.resourceId) })).filter((bookmark) => bookmark.resource) });
  } catch (error) { return next(error); }
});

router.put('/bookmarks/:resourceId', validate(z.object({ resourceId: z.string().min(1).max(50) }), 'params'), async (req, res, next) => {
  try {
    const resource = getResourceById(req.params.resourceId);
    if (!resource) throw httpError(404, 'Resource not found in the curated library.');
    try { await Bookmark.updateOne({ userId: req.user._id, resourceId: resource.id }, { $setOnInsert: { resourceId: resource.id } }, { upsert: true }); }
    catch (error) { if (error.code !== 11000) throw error; }
    return res.json({ resource });
  } catch (error) { return next(error); }
});

router.delete('/bookmarks/:resourceId', validate(z.object({ resourceId: z.string().min(1).max(50) }), 'params'), async (req, res, next) => {
  try {
    await Bookmark.deleteOne({ userId: req.user._id, resourceId: req.params.resourceId });
    return res.json({ message: 'Bookmark removed.' });
  } catch (error) { return next(error); }
});

router.get('/reminders', async (req, res, next) => {
  try {
    await deliverDueReminder(req.user);
    const reminders = await Reminder.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
    return res.json({ emailConfigured: emailConfigured(), reminders: reminders.map((reminder) => ({ id: reminder.id, date: reminder.date, message: reminder.message, readAt: reminder.readAt, emailSentAt: reminder.emailSentAt })) });
  } catch (error) { return next(error); }
});

router.patch('/reminders/:id/read', validate(z.object({ id: objectIdSchema }), 'params'), async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
    if (!reminder) throw httpError(404, 'Reminder not found.');
    return res.json({ id: reminder.id, readAt: reminder.readAt });
  } catch (error) { return next(error); }
});

export default router;
