import StudyPlan from '../models/StudyPlan.js';
import { getLatestRoadmap } from './roadmapService.js';
import { httpError } from './httpError.js';
import { createHash } from 'node:crypto';

export function preferencesKey(preferences) {
  return createHash('sha256').update(JSON.stringify({
    timezone: preferences.timezone, studyDays: [...preferences.studyDays].sort(), sessionMinutes: preferences.sessionMinutes,
  })).digest('hex').slice(0, 16);
}

export function localDate(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type).value).join('-');
}

export function addDays(date, count) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

function taskPending(task, roadmap) {
  const topic = roadmap.modules[task.moduleIdx]?.topics[task.topicIdx];
  return topic && (task.kind === 'review' ? topic.reviewRequired : !topic.completed);
}

export function planResponse(plan, roadmap) {
  const data = plan.toObject ? plan.toObject() : plan;
  const tasks = data.tasks.map((task) => ({
    id: task._id.toString(), moduleIdx: task.moduleIdx, topicIdx: task.topicIdx,
    title: task.title, kind: task.kind, minutes: task.minutes, carriedFrom: task.carriedFrom,
    completed: !taskPending(task, roadmap),
  }));
  return {
    id: data._id.toString(), roadmapId: roadmap.id, date: data.date, timezone: data.timezone,
    budgetMinutes: data.budgetMinutes, plannedMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
    completedMinutes: tasks.filter((task) => task.completed).reduce((sum, task) => sum + task.minutes, 0),
    tasks,
  };
}

export async function getStudyPlan(user, date = localDate(new Date(), user.preferences.timezone)) {
  const roadmap = await getLatestRoadmap(user._id);
  if (!roadmap) throw httpError(404, 'Create a roadmap before planning your study day.');
  const today = localDate(new Date(), user.preferences.timezone);
  if (date > addDays(today, 28) || date < addDays(today, -365)) throw httpError(400, 'Choose a date within the past year or the next 28 days.');
  const identity = { userId: user._id, roadmapId: roadmap._id, date, scheduleVersion: roadmap.scheduleVersion || 0, preferencesKey: preferencesKey(user.preferences) };
  let plan = await StudyPlan.findOne(identity);
  if (plan && !(plan.forecast && date <= today)) return { plan, roadmap, response: planResponse(plan, roadmap) };

  const { studyDays, sessionMinutes, timezone } = user.preferences;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const budgetMinutes = studyDays.includes(weekday) ? Math.floor(roadmap.hoursPerWeek * 60 / studyDays.length) : 0;
  const previous = await StudyPlan.find({ userId: user._id, roadmapId: roadmap._id, scheduleVersion: roadmap.scheduleVersion || 0, preferencesKey: identity.preferencesKey, forecast: false, date: { $lt: date, $gte: addDays(date, -7) } }).sort({ date: -1 }).lean();
  const backlog = previous.flatMap((entry) => entry.tasks.filter((task) => taskPending(task, roadmap)).map((task) => ({ ...task, carriedFrom: entry.date })));
  const topics = roadmap.modules.flatMap((module, moduleIdx) => module.topics.flatMap((topic, topicIdx) => [
    ...(topic.reviewRequired ? [{ moduleIdx, topicIdx, title: topic.title, kind: 'review' }] : []),
    ...(!topic.completed ? [{ moduleIdx, topicIdx, title: topic.title, kind: 'study' }] : []),
  ]));
  const tasks = [];
  const seen = new Set();
  let remaining = budgetMinutes;
  const reviews = topics.filter((task) => task.kind === 'review');
  for (const task of [...reviews, ...backlog, ...topics]) {
    const key = `${task.moduleIdx}:${task.topicIdx}:${task.kind}`;
    if (!remaining) break;
    if (seen.has(key)) continue;
    seen.add(key);
    const minutes = Math.min(task.kind === 'review' ? 20 : sessionMinutes, remaining);
    tasks.push({ moduleIdx: task.moduleIdx, topicIdx: task.topicIdx, title: task.title, kind: task.kind, carriedFrom: task.carriedFrom, minutes });
    remaining -= minutes;
  }
  try {
    if (plan) {
      plan = await StudyPlan.findOneAndUpdate({ _id: plan._id, forecast: true }, { $set: { tasks, budgetMinutes, timezone, forecast: false } }, { new: true }) || await StudyPlan.findOne(identity);
    } else {
      plan = await StudyPlan.create({ ...identity, timezone, budgetMinutes, tasks, forecast: date > today });
    }
  } catch (error) {
    if (error.code !== 11000) throw error;
    plan = await StudyPlan.findOne(identity);
  }
  return { plan, roadmap, response: planResponse(plan, roadmap) };
}
