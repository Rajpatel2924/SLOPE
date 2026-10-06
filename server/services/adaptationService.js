import { createHash } from 'node:crypto';
import QuizAttempt from '../models/QuizAttempt.js';
import StudyPlan from '../models/StudyPlan.js';
import { addDays, localDate, preferencesKey } from './studyPlanService.js';

export async function adaptationEvidence(user, roadmap) {
  const attempts = await QuizAttempt.find({ userId: user._id, roadmapId: roadmap._id }).sort({ createdAt: -1, _id: -1 }).lean();
  const latest = new Map();
  for (const attempt of attempts) {
    const key = `${attempt.moduleIdx}:${attempt.topicIdx}`;
    if (!latest.has(key)) latest.set(key, attempt);
  }
  const today = localDate(new Date(), user.preferences.timezone);
  const plans = await StudyPlan.find({ userId: user._id, roadmapId: roadmap._id, scheduleVersion: roadmap.scheduleVersion || 0, preferencesKey: preferencesKey(user.preferences), forecast: false,
    date: { $lt: today, $gte: addDays(today, -7) } }).sort({ date: 1 }).lean();
  const missedDays = plans.filter((plan) => plan.tasks.some((task) => {
    const topic = roadmap.modules[task.moduleIdx]?.topics[task.topicIdx];
    return topic && (task.kind === 'review' ? topic.reviewRequired : !topic.completed);
  })).length;
  const hash = createHash('sha256').update(JSON.stringify({
    version: roadmap.__v, preferences: user.preferences.toObject(), today,
    attempts: [...latest.values()].map((attempt) => attempt._id.toString()),
    plans: plans.map((plan) => plan._id.toString()), missedDays,
  })).digest('hex');
  return { latest, missedDays, hash };
}

export function proposeAdaptation(roadmap, preferences, evidence, hoursPerWeek) {
  const reviewTopics = [];
  let nextWeek = 1;
  let usedCatchup = false;
  const modules = roadmap.toObject().modules.map((module, moduleIdx) => {
    const topics = module.topics.map((topic, topicIdx) => {
      const attempt = evidence.latest.get(`${moduleIdx}:${topicIdx}`);
      const reviewRequired = Boolean(attempt && attempt.score < 70);
      const reviewReason = reviewRequired ? `Latest quiz: ${attempt.score}%. Revisit the explanations and practice this topic.` : '';
      if (reviewRequired) reviewTopics.push({ moduleIdx, topicIdx, title: topic.title, score: attempt.score, reason: reviewReason });
      return { ...topic, reviewRequired, reviewReason };
    });
    const pending = topics.filter((topic) => !topic.completed).length;
    const reviews = topics.filter((topic) => topic.reviewRequired).length;
    const pendingMinutes = pending * preferences.sessionMinutes + reviews * 20;
    let duration = pendingMinutes ? Math.max(1, Math.ceil(pendingMinutes / (hoursPerWeek * 60))) : module.weekEnd - module.weekStart + 1;
    if (pendingMinutes && evidence.missedDays && !usedCatchup) {
      duration += Math.ceil(evidence.missedDays / preferences.studyDays.length);
      usedCatchup = true;
    }
    const updated = { ...module, topics, weekStart: nextWeek, weekEnd: nextWeek + duration - 1 };
    nextWeek += duration;
    return updated;
  });
  return { modules, totalWeeks: nextWeek - 1, summary: {
    oldHoursPerWeek: roadmap.hoursPerWeek, hoursPerWeek,
    oldTotalWeeks: roadmap.totalWeeks, totalWeeks: nextWeek - 1,
    missedDays: evidence.missedDays, reviewTopics,
    completedTopicsPreserved: roadmap.modules.flatMap((module) => module.topics).filter((topic) => topic.completed).length,
    schedule: modules.map((module, index) => ({ title: module.title, oldWeekStart: roadmap.modules[index].weekStart, oldWeekEnd: roadmap.modules[index].weekEnd, weekStart: module.weekStart, weekEnd: module.weekEnd })),
  } };
}
