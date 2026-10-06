import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const resourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  topic: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  type: z.enum(['video', 'docs', 'course', 'practice', 'article']),
  url: z.string().url(),
}).strict();

const resourceFilePath = fileURLToPath(new URL('../data/resources.json', import.meta.url));
let resourceCache;

function loadResources() {
  if (!resourceCache) {
    const fileContents = readFileSync(resourceFilePath, 'utf8');
    resourceCache = z.array(resourceSchema).parse(JSON.parse(fileContents));
  }

  return resourceCache;
}

function tokenize(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]/g, ' ')
    .split(/[\s-]+/)
    .filter((token) => token.length > 1);
}

function levelScore(resourceLevel, targetLevel) {
  if (resourceLevel === targetLevel) return 3;
  if (targetLevel === 'beginner' && resourceLevel === 'intermediate') return 1;
  if (targetLevel === 'advanced' && resourceLevel === 'intermediate') return 2;
  return 0;
}

function goalAliases(goal) {
  const normalizedGoal = goal.toLowerCase();

  if (/web|frontend|front-end|backend|back-end|full.?stack|react|node|javascript/.test(normalizedGoal)) {
    return 'html css javascript react node express mongodb git project';
  }

  if (/\b(ai|ml)\b|machine[ -]learning|data science|deep learning/.test(normalizedGoal)) {
    return 'python machine learning sql project statistics';
  }

  if (/placement|dsa|algorithm|competitive|interview|software engineer/.test(normalizedGoal)) {
    return 'arrays strings linked lists trees graphs dynamic programming sorting searching big-o sql oop operating systems dbms networks aptitude interview';
  }

  return 'engineering computer science programming project interview';
}

function keywordScore(resource, text) {
  const tokens = new Set(tokenize(text));
  const ignored = new Set(['and', 'the', 'to', 'in', 'of', 'a', 'for', 'with']);
  return tokenize(`${resource.title} ${resource.topic}`)
    .filter((token) => !ignored.has(token) && tokens.has(token)).length * 4;
}

function resourceScore(resource, goal, level) {
  const goalTokens = new Set(tokenize(`${goal} ${goalAliases(goal)}`));
  const resourceTokens = new Set(tokenize(`${resource.title} ${resource.topic}`));
  let relevance = 0;

  for (const token of resourceTokens) {
    if (goalTokens.has(token)) relevance += 4;
  }

  return {
    relevance,
    score: relevance + levelScore(resource.level, level),
  };
}

export function getResources(topic) {
  const resources = loadResources();

  if (!topic) {
    return resources;
  }

  const normalizedTopic = topic.trim().toLowerCase();
  return resources.filter((resource) => (
    resource.topic.toLowerCase().includes(normalizedTopic)
    || resource.title.toLowerCase().includes(normalizedTopic)
  ));
}

export function getResourceById(id) {
  return loadResources().find((resource) => resource.id === id) || null;
}

export function getResourceMap() {
  return new Map(loadResources().map((resource) => [resource.id, resource]));
}

export function expandResourceIds(resourceIds = []) {
  const resourceMap = getResourceMap();
  return resourceIds.map((id) => resourceMap.get(id)).filter(Boolean);
}

export function selectResourcesForGoal(goal, level, limit = 40) {
  const resources = loadResources();
  const ranked = resources
    .map((resource) => ({
      resource,
      ...resourceScore(resource, goal, level),
    }))
    .sort((left, right) => right.score - left.score);
  const matches = ranked.filter(({ relevance }) => relevance > 0);

  if (matches.length < 10) {
    return resources.slice(0, limit);
  }

  return matches.slice(0, limit).map(({ resource }) => resource);
}

export function getBestResourceForTopic(topic, goal, level, resources = loadResources()) {
  const ranked = resources
    .map((resource) => ({
      resource,
      score: keywordScore(resource, topic) * 10 + resourceScore(resource, goal, level).score,
    }))
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.resource || resources[0];
}
