import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localDate, addDays } from '../services/studyPlanService.js';
import { createFallbackRoadmap } from '../services/fallbackRoadmaps.js';
import { curatedQuiz } from '../data/quizBank.js';
import { quizContentSchema } from '../services/aiService.js';

test('calendar calculations honor timezone boundaries and daylight saving dates', () => {
  const moment = new Date('2026-03-08T04:30:00Z');
  assert.equal(localDate(moment, 'America/New_York'), '2026-03-07');
  assert.equal(localDate(moment, 'Asia/Kolkata'), '2026-03-08');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('all fallback roadmap topics have valid curated quiz coverage', () => {
  for (const goal of ['Web Developer', 'DSA & Placements', 'AI/ML Engineer']) {
    const roadmap = createFallbackRoadmap(goal, 8);
    for (const topic of roadmap.modules.flatMap((module) => module.topics)) {
      const quiz = curatedQuiz(topic.title);
      assert.ok(quiz, `Missing question coverage for ${topic.title}`);
      quizContentSchema.parse({ questions: quiz.questions });
    }
  }
  assert.equal(curatedQuiz('Quantum teleportation'), null);
});
