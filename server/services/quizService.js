import { randomInt } from 'node:crypto';
import { curatedQuiz } from '../data/quizBank.js';
import { generateTopicQuiz, quizContentSchema } from './aiService.js';
import { httpError } from './httpError.js';

export async function buildQuiz(topic, level) {
  let result;
  if (process.env.GEMINI_API_KEY?.trim()) {
    try { result = { ...await generateTopicQuiz(topic, level), source: 'ai', focus: topic.title }; }
    catch { console.error('Topic quiz generation failed; checking curated question coverage.'); }
  }
  if (!result) {
    const curated = curatedQuiz(topic.title);
    if (!curated) throw httpError(503, 'A quiz for this topic is not available right now. Please try again when the AI service is available.');
    result = { ...curated, source: 'curated' };
  }
  quizContentSchema.parse({ questions: result.questions });
  // Shuffle answers so curated correct answers are not always in the same position.
  result.questions = result.questions.map((question) => {
    const options = question.options.map((text, index) => ({ text, index }));
    for (let index = options.length - 1; index > 0; index -= 1) {
      const target = randomInt(index + 1);
      [options[index], options[target]] = [options[target], options[index]];
    }
    return { ...question, options: options.map(({ text }) => text), correctIndex: options.findIndex(({ index }) => index === question.correctIndex) };
  });
  return result;
}

export function publicQuiz(quiz) {
  return {
    id: quiz.id, roadmapId: quiz.roadmapId.toString(), moduleIdx: quiz.moduleIdx, topicIdx: quiz.topicIdx,
    topicTitle: quiz.topicTitle, source: quiz.source, focus: quiz.focus, expiresAt: quiz.expiresAt,
    questions: quiz.questions.map(({ prompt, options }) => ({ prompt, options })),
  };
}

export function publicAttempt(attempt) {
  return {
    id: attempt.id, quizId: attempt.quizId.toString(), roadmapId: attempt.roadmapId.toString(),
    moduleIdx: attempt.moduleIdx, topicIdx: attempt.topicIdx, topicTitle: attempt.topicTitle,
    source: attempt.source, score: attempt.score, correct: attempt.correct, total: attempt.total,
    review: attempt.review, createdAt: attempt.createdAt,
  };
}
