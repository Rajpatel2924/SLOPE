import User from '../models/User.js';
import Reminder from '../models/Reminder.js';
import { emailConfigured, sendEmail } from './emailService.js';
import { getStudyPlan, localDate } from './studyPlanService.js';

export function reminderDue(preferences, now) {
  if (!preferences.reminderEnabled) return false;
  const date = localDate(now, preferences.timezone);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!preferences.studyDays.includes(weekday)) return false;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: preferences.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return time >= preferences.reminderTime;
}

export async function deliverDueReminder(user, now = new Date()) {
  if (!reminderDue(user.preferences, now)) return { due: false };
  const date = localDate(now, user.preferences.timezone);
  let response;
  try { ({ response } = await getStudyPlan(user, date)); }
  catch (error) { if (error.statusCode === 404) return { due: false }; throw error; }
  const pending = response.tasks.filter((task) => !task.completed);
  if (!pending.length) return { due: false };
  const message = `${pending.length} study task${pending.length === 1 ? '' : 's'} remain for ${date}. Start with ${pending[0].title}.`;
  let reminder;
  try {
    reminder = await Reminder.findOneAndUpdate({ userId: user._id, date }, { $setOnInsert: { message } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    reminder = await Reminder.findOne({ userId: user._id, date });
  }
  if (!emailConfigured() || reminder.emailSentAt) return { due: true, emailed: false };
  const leased = await Reminder.findOneAndUpdate({
    _id: reminder._id, emailSentAt: { $exists: false }, attempts: { $lt: 3 },
    $and: [
      { $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lt: now } }] },
      { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: now } }] },
    ],
  }, { $set: { lockUntil: new Date(now.valueOf() + 60000) }, $inc: { attempts: 1 } }, { new: true });
  if (!leased) return { due: true, emailed: false };
  try {
    await sendEmail({ to: user.email, subject: 'Your SLOPE study reminder',
      text: `${message}\n\nOpen your daily plan: ${new URL('/study-plan', process.env.CLIENT_URL || 'http://localhost:5173')}\n\nYou can turn off reminders in Account settings.` });
    await Reminder.updateOne({ _id: reminder._id }, { $set: { emailSentAt: new Date() }, $unset: { lockUntil: 1, nextAttemptAt: 1 } });
    return { due: true, emailed: true };
  } catch {
    await Reminder.updateOne({ _id: reminder._id }, { $set: { nextAttemptAt: new Date(now.valueOf() + 5 * 60000) }, $unset: { lockUntil: 1 } });
    console.error('Study reminder email delivery failed; retry scheduled.');
    return { due: true, emailed: false, failed: true };
  }
}

export async function runReminderBatch(now = new Date()) {
  const results = { checked: 0, due: 0, emailed: 0, failed: 0 };
  for await (const user of User.find({ 'preferences.reminderEnabled': true }).cursor()) {
    results.checked += 1;
    try {
      const result = await deliverDueReminder(user, now);
      if (result.due) results.due += 1;
      if (result.emailed) results.emailed += 1;
      if (result.failed) results.failed += 1;
    } catch { results.failed += 1; console.error('Study reminder could not be prepared.'); }
  }
  return results;
}

export function startReminderWorker() {
  if (process.env.REMINDERS_ENABLED !== 'true') return () => {};
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runReminderBatch(); }
    catch { console.error('Study reminder worker failed.'); }
    finally { running = false; }
  };
  const timer = setInterval(tick, 60000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
