import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Roadmap from '../models/Roadmap.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Reminder from '../models/Reminder.js';
import { deliverDueReminder, reminderDue } from '../services/reminderService.js';
import { localDate, addDays } from '../services/studyPlanService.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'slope-integration-test-secret-with-32-characters';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.RESEND_API_KEY = '';
process.env.EMAIL_FROM = '';
process.env.GEMINI_API_KEY = '';

const nativeFetch = globalThis.fetch;
let mongo;
let directory;
let server;
let baseUrl;
let alice;
let bob;
let token;
let bobToken;

async function unusedPort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function request(path, { method = 'GET', body, auth = token } = {}) {
  const response = await nativeFetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

before(async () => {
  const { default: app } = await import('../index.js');
  const databaseName = `slope_test_${randomUUID().replaceAll('-', '')}`;
  let uri = process.env.TEST_MONGO_URI;
  if (!uri) {
    directory = await mkdtemp(join(tmpdir(), 'slope-tests-'));
    const port = await unusedPort();
    mongo = spawn('mongod', ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet'], { stdio: 'ignore' });
    let startupError;
    mongo.on('error', (error) => { startupError = error; });
    uri = `mongodb://127.0.0.1:${port}`;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (startupError) throw new Error('Tests require mongod on PATH or TEST_MONGO_URI pointing to a test MongoDB server.');
  }
  await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 15000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}, { timeout: 30000 });

beforeEach(async () => {
  const suffix = randomUUID();
  const passwordHash = await bcrypt.hash('original-password', 10);
  [alice, bob] = await User.create([
    { name: 'Alice Student', email: `alice-${suffix}@example.com`, passwordHash },
    { name: 'Bob Student', email: `bob-${suffix}@example.com`, passwordHash },
  ]);
  token = jwt.sign({ sub: alice.id, version: 0 }, process.env.JWT_SECRET);
  bobToken = jwt.sign({ sub: bob.id, version: 0 }, process.env.JWT_SECRET);
});

after(async () => {
  globalThis.fetch = nativeFetch;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.db?.databaseName.startsWith('slope_test_')) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo && mongo.exitCode === null) {
    const exited = new Promise((resolve) => mongo.once('exit', resolve));
    mongo.kill('SIGTERM');
    await exited;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('account settings are validated, persisted, and private to the signed-in user', async () => {
  const preferences = { timezone: 'America/New_York', studyDays: [0, 2, 4], sessionMinutes: 30, reminderEnabled: false, reminderTime: '09:30' };
  assert.equal((await request('/auth/account', { method: 'PATCH', body: { name: 'Alice Updated', preferences } })).status, 200);
  const me = await request('/auth/me');
  assert.equal(me.data.user.name, 'Alice Updated');
  assert.deepEqual(me.data.user.preferences, preferences);
  assert.equal(me.data.user.passwordHash, undefined);
  assert.equal((await request('/auth/me', { auth: bobToken })).data.user.name, 'Bob Student');
  assert.equal((await request('/auth/account', { method: 'PATCH', body: { name: 'Alice', preferences: { ...preferences, studyDays: [] } } })).status, 400);
  assert.equal((await request('/auth/account', { method: 'PATCH', body: { name: 'Alice', preferences: { ...preferences, timezone: 'Invalid/Timezone' } } })).status, 400);
  assert.equal((await request('/auth/me', { auth: null })).status, 401);
});

test('password changes verify the old password and invalidate older sessions', async () => {
  assert.equal((await request('/auth/change-password', { method: 'POST', body: { currentPassword: 'wrong', password: 'new-password-123' } })).status, 400);
  const changed = await request('/auth/change-password', { method: 'POST', body: { currentPassword: 'original-password', password: 'new-password-123' } });
  assert.equal(changed.status, 200);
  assert.equal((await request('/auth/me')).status, 401);
  assert.equal((await request('/auth/me', { auth: changed.data.token })).status, 200);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: alice.email, password: 'original-password' } })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: alice.email, password: 'new-password-123' } })).status, 200);
});

test('reset tokens are hashed, expire, are single-use, and invalidate old JWTs', async () => {
  const recovery = await request('/auth/forgot-password', { method: 'POST', auth: null, body: { email: alice.email } });
  const resetToken = new URLSearchParams(new URL(recovery.data.previewUrl).hash.slice(1)).get('token');
  const stored = await User.findById(alice.id).select('+resetTokenHash');
  assert.notEqual(stored.resetTokenHash, resetToken);
  const reset = () => request('/auth/reset-password', { method: 'POST', auth: null, body: { token: resetToken, password: 'recovered-password' } });
  const results = await Promise.all([reset(), reset()]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
  assert.equal((await request('/auth/me')).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { email: alice.email, password: 'recovered-password' } })).status, 200);
  const expired = await request('/auth/forgot-password', { method: 'POST', body: { email: bob.email } });
  const expiredToken = new URLSearchParams(new URL(expired.data.previewUrl).hash.slice(1)).get('token');
  await User.updateOne({ _id: bob.id }, { $set: { resetTokenExpiresAt: new Date(0) } });
  assert.equal((await request('/auth/reset-password', { method: 'POST', body: { token: expiredToken, password: 'recovered-password' } })).status, 400);
});

test('production recovery does not reveal account existence or return reset tokens', async () => {
  process.env.NODE_ENV = 'production';
  process.env.RESEND_API_KEY = 'test-mail-key';
  process.env.EMAIL_FROM = 'SLOPE <test@example.com>';
  let sent;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    sent = JSON.parse(options.body);
    return new Response('{}', { status: 200 });
  };
  try {
    const known = await request('/auth/forgot-password', { method: 'POST', body: { email: alice.email } });
    const unknown = await request('/auth/forgot-password', { method: 'POST', body: { email: 'missing@example.com' } });
    assert.deepEqual(known, unknown);
    assert.equal(known.data.previewUrl, undefined);
    assert.match(sent.text, /reset-password#token=/);
    assert.deepEqual(sent.to, [alice.email]);
  } finally {
    process.env.NODE_ENV = 'test'; process.env.RESEND_API_KEY = ''; process.env.EMAIL_FROM = '';
    globalThis.fetch = nativeFetch;
  }
});

async function seedRoadmap(user = alice) {
  return Roadmap.create({ userId: user._id, goal: 'Learn JavaScript', level: 'beginner', hoursPerWeek: 4, totalWeeks: 4, source: 'fallback', modules: [
    { title: 'JavaScript fundamentals', weekStart: 1, weekEnd: 4, topics: [
      { title: 'JavaScript arrays', description: 'Practice array operations.', resourceIds: ['r1'], completed: true, completedAt: new Date() },
      { title: 'JavaScript functions', description: 'Write and call functions.', resourceIds: ['r1'] },
      { title: 'JavaScript async', description: 'Understand promises.', resourceIds: ['r1'] },
    ] },
  ] });
}

test('daily plans respect local study days, exclude completed topics, and persist across refresh', async () => {
  await seedRoadmap();
  const today = localDate(new Date(), alice.preferences.timezone);
  await User.updateOne({ _id: alice.id }, { $set: { 'preferences.studyDays': [new Date(`${today}T12:00:00Z`).getUTCDay()] } });
  const [first, second] = await Promise.all([request('/study-plan'), request('/study-plan')]);
  assert.equal(first.status, 200);
  assert.equal(first.data.id, second.data.id);
  assert.equal(first.data.budgetMinutes, 240);
  assert.equal(first.data.tasks.length, 2);
  assert.ok(first.data.tasks.every((task) => task.topicIdx !== 0));
  const task = first.data.tasks[0];
  assert.equal((await request(`/study-plan/${first.data.id}/tasks/${task.id}`, { method: 'PATCH', body: { completed: true }, auth: bobToken })).status, 404);
  const saved = await request(`/study-plan/${first.data.id}/tasks/${task.id}`, { method: 'PATCH', body: { completed: true } });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.tasks[0].completed, true);
  assert.equal((await request('/roadmap')).data.roadmap.modules[0].topics[1].completed, true);
  assert.equal((await request('/study-plan')).data.tasks[0].completed, true);
  const rest = await request(`/study-plan?date=${addDays(today, 1)}`);
  assert.equal(rest.data.budgetMinutes, 0);
  assert.equal(rest.data.tasks.length, 0);
  assert.equal((await request('/study-plan?date=2026-02-30')).status, 400);
});

test('daily plan completion rejects tasks for an old roadmap and future dates', async () => {
  await seedRoadmap();
  await User.updateOne({ _id: alice.id }, { $set: { 'preferences.studyDays': [0, 1, 2, 3, 4, 5, 6] } });
  const today = localDate(new Date(), alice.preferences.timezone);
  const future = await request(`/study-plan?date=${addDays(today, 1)}`);
  assert.equal((await request(`/study-plan/${future.data.id}/tasks/${future.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } })).status, 400);
  const plan = await request('/study-plan');
  await seedRoadmap();
  assert.equal((await request(`/study-plan/${plan.data.id}/tasks/${plan.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } })).status, 409);
});

test('quizzes hide answer keys, grade on the server, save once, and isolate user results', async () => {
  const roadmap = await seedRoadmap();
  const started = await request('/quizzes/start', { method: 'POST', body: { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 0 } });
  assert.equal(started.status, 201);
  assert.equal(started.data.quiz.source, 'curated');
  assert.equal(started.data.quiz.questions.length, 5);
  assert.ok(started.data.quiz.questions.every((question) => question.correctIndex === undefined && question.explanation === undefined));
  const quiz = await Quiz.findById(started.data.quiz.id);
  const answers = quiz.questions.map((question) => question.correctIndex);
  assert.equal((await request(`/quizzes/${quiz.id}`, { auth: bobToken })).status, 404);
  assert.equal((await request(`/quizzes/${quiz.id}/submit`, { method: 'POST', body: { answers, score: 100 } })).status, 400);
  const results = await Promise.all([1, 2].map(() => request(`/quizzes/${quiz.id}/submit`, { method: 'POST', body: { answers } })));
  assert.ok(results.every((result) => result.status === 200 && result.data.attempt.score === 100));
  assert.equal(results[0].data.attempt.id, results[1].data.attempt.id);
  assert.equal(await QuizAttempt.countDocuments({ quizId: quiz._id }), 1);
  assert.equal((await request('/quizzes/attempts')).data.attempts.length, 1);
  assert.equal((await request('/quizzes/attempts', { auth: bobToken })).data.attempts.length, 0);
  assert.equal((await request('/roadmap')).data.roadmap.modules[0].topics[1].completed, false);
});

test('expired, incomplete, stale-roadmap, and unsupported quizzes are handled explicitly', async () => {
  const roadmap = await seedRoadmap();
  const start = () => request('/quizzes/start', { method: 'POST', body: { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 1 } });
  const started = await start();
  assert.equal((await request(`/quizzes/${started.data.quiz.id}/submit`, { method: 'POST', body: { answers: [0, 0] } })).status, 400);
  await Quiz.updateOne({ _id: started.data.quiz.id }, { $set: { expiresAt: new Date(0) } });
  assert.equal((await request(`/quizzes/${started.data.quiz.id}/submit`, { method: 'POST', body: { answers: [0, 0, 0, 0, 0] } })).status, 400);
  await Roadmap.updateOne({ _id: roadmap.id }, { $set: { 'modules.0.topics.1.title': 'Quantum teleportation' } });
  assert.equal((await start()).status, 503);
  await seedRoadmap();
  assert.equal((await start()).status, 409);
});

test('adaptive preview uses latest quiz evidence, preserves completion, and regenerates daily plans', async () => {
  const roadmap = await seedRoadmap();
  await User.updateOne({ _id: alice.id }, { $set: { 'preferences.studyDays': [0, 1, 2, 3, 4, 5, 6] } });
  const originalPlan = await request('/study-plan');
  const started = await request('/quizzes/start', { method: 'POST', body: { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 0 } });
  const quiz = await Quiz.findById(started.data.quiz.id);
  await request(`/quizzes/${quiz.id}/submit`, { method: 'POST', body: { answers: quiz.questions.map((question) => (question.correctIndex + 1) % 4) } });
  const preview = await request('/adaptation/preview', { method: 'POST', body: { hoursPerWeek: 1 } });
  assert.equal(preview.status, 200);
  assert.equal(preview.data.reviewTopics.length, 1);
  assert.equal(preview.data.completedTopicsPreserved, 1);
  assert.equal((await request(`/adaptation/${preview.data.id}/apply`, { method: 'POST', auth: bobToken })).status, 404);
  const applied = await request(`/adaptation/${preview.data.id}/apply`, { method: 'POST' });
  assert.equal(applied.status, 200);
  const topic = applied.data.roadmap.modules[0].topics[0];
  assert.equal(topic.completed, true);
  assert.equal(new Date(topic.completedAt).valueOf(), roadmap.modules[0].topics[0].completedAt.valueOf());
  assert.equal(topic.reviewRequired, true);
  assert.equal(applied.data.roadmap.hoursPerWeek, 1);
  const updatedPlan = await request('/study-plan');
  assert.notEqual(updatedPlan.data.id, originalPlan.data.id);
  assert.equal(updatedPlan.data.tasks[0].kind, 'review');
  assert.equal((await request(`/study-plan/${originalPlan.data.id}/tasks/${originalPlan.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } })).status, 409);
  const reviewed = await request(`/study-plan/${updatedPlan.data.id}/tasks/${updatedPlan.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } });
  assert.equal(reviewed.status, 200);
  assert.equal((await request('/roadmap')).data.roadmap.modules[0].topics[0].reviewRequired, false);
  assert.equal((await request(`/adaptation/${preview.data.id}/apply`, { method: 'POST' })).status, 409);
});

test('adaptive apply rejects previews after progress changes', async () => {
  await seedRoadmap();
  const preview = await request('/adaptation/preview', { method: 'POST', body: { hoursPerWeek: 2 } });
  await request('/roadmap/topic/0/1', { method: 'PATCH', body: { completed: true } });
  assert.equal((await request(`/adaptation/${preview.data.id}/apply`, { method: 'POST' })).status, 409);
  assert.equal((await request('/roadmap')).data.roadmap.modules[0].topics[1].completed, true);
});

test('topic notes persist, search literally, survive roadmap replacement, and enforce ownership', async () => {
  const roadmap = await seedRoadmap();
  const reference = { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 1 };
  const saved = await request('/library/notes/topic', { method: 'PUT', body: { ...reference, content: 'Example: [a+b] closure and return value.' } });
  assert.equal(saved.status, 200);
  const lookup = `/library/notes/topic?roadmapId=${roadmap.id}&moduleIdx=0&topicIdx=1`;
  assert.equal((await request(lookup)).data.note.content, 'Example: [a+b] closure and return value.');
  assert.equal((await request(lookup, { auth: bobToken })).status, 404);
  assert.equal((await request('/library/notes?search=%5Ba%2Bb%5D')).data.notes.length, 1);
  assert.equal((await request('/library/notes', { auth: bobToken })).data.notes.length, 0);
  await seedRoadmap();
  assert.equal((await request(lookup)).data.note.id, saved.data.note.id);
  assert.equal((await request(`/library/notes/${saved.data.note.id}`, { method: 'DELETE', auth: bobToken })).status, 404);
  assert.equal((await request(`/library/notes/${saved.data.note.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await request(lookup)).data.note, null);
});

test('bookmarks are idempotent, curated-only, and private to each user', async () => {
  const saves = await Promise.all([1, 2].map(() => request('/library/bookmarks/r1', { method: 'PUT' })));
  assert.ok(saves.every((result) => result.status === 200));
  assert.equal((await request('/library/bookmarks')).data.bookmarks.length, 1);
  assert.equal((await request('/library/bookmarks', { auth: bobToken })).data.bookmarks.length, 0);
  assert.equal((await request('/library/bookmarks/made-up-resource', { method: 'PUT' })).status, 404);
  await request('/library/bookmarks/r1', { method: 'DELETE', auth: bobToken });
  assert.equal((await request('/library/bookmarks')).data.bookmarks.length, 1);
  await request('/library/bookmarks/r1', { method: 'DELETE' });
  assert.equal((await request('/library/bookmarks')).data.bookmarks.length, 0);
});

test('reminders respect timezone, study days, and opt-in; delivery is deduplicated across workers', async () => {
  const timezoneExample = new Date('2026-10-07T02:00:00Z');
  const preferences = { timezone: 'America/Los_Angeles', studyDays: [2], sessionMinutes: 45, reminderEnabled: true, reminderTime: '18:00' };
  assert.equal(reminderDue(preferences, timezoneExample), true);
  assert.equal(reminderDue({ ...preferences, reminderEnabled: false }, timezoneExample), false);
  assert.equal(reminderDue({ ...preferences, studyDays: [3] }, timezoneExample), false);
  assert.equal(reminderDue({ ...preferences, reminderTime: '20:00' }, timezoneExample), false);
  const now = new Date();
  await seedRoadmap();
  alice.preferences = { ...preferences, timezone: 'UTC', studyDays: [now.getUTCDay()], reminderTime: '00:00' };
  await alice.save();
  process.env.RESEND_API_KEY = 'test-mail-key'; process.env.EMAIL_FROM = 'SLOPE <test@example.com>';
  let deliveries = 0;
  globalThis.fetch = async (url, options) => { deliveries += 1; assert.match(options.headers['Idempotency-Key'], /^slope-reminder-/); return new Response('{}', { status: 200 }); };
  try {
    const results = await Promise.all([deliverDueReminder(alice, now), deliverDueReminder(alice, now)]);
    assert.equal(results.filter((result) => result.emailed).length, 1);
    assert.equal(deliveries, 1);
    assert.equal(await Reminder.countDocuments({ userId: alice.id }), 1);
    const reminders = await request('/library/reminders');
    assert.equal(reminders.data.reminders.length, 1);
    assert.equal((await request('/library/reminders', { auth: bobToken })).data.reminders.length, 0);
    const id = reminders.data.reminders[0].id;
    assert.equal((await request(`/library/reminders/${id}/read`, { method: 'PATCH', auth: bobToken })).status, 404);
    assert.equal((await request(`/library/reminders/${id}/read`, { method: 'PATCH' })).status, 200);
    assert.equal((await request('/library/reminders/run', { method: 'POST' })).status, 401);
  } finally { process.env.RESEND_API_KEY = ''; process.env.EMAIL_FROM = ''; globalThis.fetch = nativeFetch; }
});

test('daily plans carry overdue tasks and refresh when planning preferences change', async () => {
  await seedRoadmap();
  alice.preferences.studyDays = [0, 1, 2, 3, 4, 5, 6];
  await alice.save();
  const today = localDate(new Date(), alice.preferences.timezone);
  const yesterday = await request(`/study-plan?date=${addDays(today, -1)}`);
  const current = await request('/study-plan');
  assert.equal(current.data.tasks[0].carriedFrom, yesterday.data.date);
  await User.updateOne({ _id: alice.id }, { $set: { 'preferences.sessionMinutes': 15 } });
  const refreshed = await request('/study-plan');
  assert.notEqual(refreshed.data.id, current.data.id);
  assert.equal(refreshed.data.tasks[0].minutes, 15);
  assert.equal((await request(`/study-plan/${current.data.id}/tasks/${current.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } })).status, 409);
});

test('adaptive previews use the newest attempt and account for missed study days', async () => {
  const roadmap = await seedRoadmap();
  alice.preferences.studyDays = [0, 1, 2, 3, 4, 5, 6];
  await alice.save();
  const today = localDate(new Date(), alice.preferences.timezone);
  await request(`/study-plan?date=${addDays(today, -1)}`);
  for (const correct of [false, true]) {
    const started = await request('/quizzes/start', { method: 'POST', body: { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 0 } });
    const quiz = await Quiz.findById(started.data.quiz.id);
    await request(`/quizzes/${quiz.id}/submit`, { method: 'POST', body: { answers: quiz.questions.map((question) => correct ? question.correctIndex : (question.correctIndex + 1) % 4) } });
  }
  const preview = await request('/adaptation/preview', { method: 'POST', body: { hoursPerWeek: 4 } });
  assert.equal(preview.data.reviewTopics.length, 0);
  assert.equal(preview.data.missedDays, 1);
  const newQuiz = await request('/quizzes/start', { method: 'POST', body: { roadmapId: roadmap.id, moduleIdx: 0, topicIdx: 1 } });
  const quiz = await Quiz.findById(newQuiz.data.quiz.id);
  await request(`/quizzes/${quiz.id}/submit`, { method: 'POST', body: { answers: quiz.questions.map((question) => question.correctIndex) } });
  assert.equal((await request(`/adaptation/${preview.data.id}/apply`, { method: 'POST' })).status, 409);
});

test('existing accounts, JWTs, and roadmaps work without a data migration', async () => {
  const roadmap = await seedRoadmap();
  await User.collection.updateOne({ _id: alice._id }, { $unset: { preferences: 1, tokenVersion: 1 } });
  await Roadmap.collection.updateOne({ _id: roadmap._id }, { $unset: { scheduleVersion: 1, 'modules.0.topics.0.reviewRequired': 1 } });
  token = jwt.sign({ sub: alice.id }, process.env.JWT_SECRET);
  const me = await request('/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.user.preferences.timezone, 'Asia/Kolkata');
  const today = localDate(new Date(), me.data.user.preferences.timezone);
  await User.updateOne({ _id: alice.id }, { $set: { 'preferences.studyDays': [new Date(`${today}T12:00:00Z`).getUTCDay()] } });
  const plan = await request('/study-plan');
  assert.equal(plan.status, 200);
  assert.equal((await request(`/study-plan/${plan.data.id}/tasks/${plan.data.tasks[0].id}`, { method: 'PATCH', body: { completed: true } })).status, 200);
});

test('reminder email failures back off and scheduler requests require a dedicated secret', async () => {
  await seedRoadmap();
  const now = new Date();
  alice.preferences = { timezone: 'UTC', studyDays: [now.getUTCDay()], sessionMinutes: 45, reminderEnabled: true, reminderTime: '00:00' };
  await alice.save();
  process.env.RESEND_API_KEY = 'test-mail-key'; process.env.EMAIL_FROM = 'test@example.com';
  let deliveries = 0;
  globalThis.fetch = async () => { deliveries += 1; return new Response('{}', { status: 503 }); };
  try {
    assert.equal((await deliverDueReminder(alice, now)).failed, true);
    assert.equal((await deliverDueReminder(alice, now)).emailed, false);
    assert.equal(deliveries, 1);
    assert.equal((await Reminder.findOne({ userId: alice.id })).emailSentAt, undefined);
  } finally { process.env.RESEND_API_KEY = ''; process.env.EMAIL_FROM = ''; globalThis.fetch = nativeFetch; }
  process.env.CRON_SECRET = 'dedicated-scheduler-secret-at-least-32-characters';
  try {
    assert.equal((await request('/library/reminders/run', { method: 'POST' })).status, 401);
    assert.equal((await request('/library/reminders/run', { method: 'POST', auth: process.env.CRON_SECRET })).status, 200);
  } finally { delete process.env.CRON_SECRET; }
});

test('a stale roadmap checkbox cannot update a newly generated roadmap', async () => {
  const original = await seedRoadmap();
  const replacement = await seedRoadmap();
  const result = await request('/roadmap/topic/0/1', { method: 'PATCH', body: { completed: true, roadmapId: original.id } });
  assert.equal(result.status, 409);
  assert.equal((await Roadmap.findById(replacement.id)).modules[0].topics[1].completed, false);
});
