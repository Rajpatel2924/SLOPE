import Roadmap from '../models/Roadmap.js';
import { aiRoadmapSchema, generateRoadmapWithAI } from './aiService.js';
import { createFallbackRoadmap } from './fallbackRoadmaps.js';
import {
  expandResourceIds,
  getBestResourceForTopic,
  getResourceMap,
  selectResourcesForGoal,
} from './resourceService.js';

function limitWords(value, maxWords = 25) {
  return value.trim().split(/\s+/).slice(0, maxWords).join(' ');
}

function validateWeekCoverage(modules, totalWeeks) {
  if (modules.length > totalWeeks) {
    throw new Error('Roadmap modules cannot exceed the number of weeks.');
  }

  let nextWeek = 1;

  for (const module of modules) {
    if (module.weekStart !== nextWeek || module.weekEnd < module.weekStart) {
      throw new Error('Roadmap weeks must be contiguous and non-overlapping.');
    }

    nextWeek = module.weekEnd + 1;
  }

  if (nextWeek !== totalWeeks + 1) {
    throw new Error('Roadmap must cover every requested week.');
  }
}

function normalizeTopics(modules, input, resourceMap) {
  return modules.map((module) => ({
    ...module,
    topics: module.topics.map((topic) => {
      const validResourceIds = [...new Set(topic.resourceIds)]
        .filter((resourceId) => resourceMap.has(resourceId))
        .slice(0, 3);
      const resourceIds = validResourceIds.length > 0
        ? validResourceIds
        : [getBestResourceForTopic(
          topic.title, input.goal, input.level, [...resourceMap.values()],
        ).id];

      return {
        title: topic.title.trim(),
        description: limitWords(topic.description),
        resourceIds,
        completed: false,
        completedAt: null,
      };
    }),
  }));
}

function normalizeAiRoadmap(rawRoadmap, input, candidates) {
  const parsedRoadmap = aiRoadmapSchema.parse(rawRoadmap);
  validateWeekCoverage(parsedRoadmap.modules, input.totalWeeks);
  const finalThirdStart = Math.floor(input.totalWeeks * 2 / 3) + 1;
  const hasProject = parsedRoadmap.modules.some((module) => (
    module.weekEnd >= finalThirdStart
    && module.topics.some((topic) => /\bproject\b|mini-project|capstone/i.test(topic.title))
  ));
  if (!hasProject) throw new Error('Roadmap must include a final-third project.');
  const resourceMap = new Map(candidates.map((resource) => [resource.id, resource]));

  return normalizeTopics(parsedRoadmap.modules, input, resourceMap);
}

function normalizeFallbackRoadmap(fallbackRoadmap, input) {
  const resourceMap = getResourceMap();
  return normalizeTopics(fallbackRoadmap.modules, input, resourceMap);
}

export async function buildRoadmap(input) {
  const candidateResources = selectResourcesForGoal(
    input.goal,
    input.level,
    40,
  );

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const aiRoadmap = await generateRoadmapWithAI(input, candidateResources);
      return {
        source: 'ai',
        modules: normalizeAiRoadmap(aiRoadmap, input, candidateResources),
      };
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 'unavailable';
      console.error(`Roadmap AI attempt ${attempt} failed (provider status: ${status}).`);
    }
  }

  const fallbackRoadmap = createFallbackRoadmap(input.goal, input.totalWeeks);

  return {
    source: 'fallback',
    modules: normalizeFallbackRoadmap(fallbackRoadmap, input),
  };
}

export async function getLatestRoadmap(userId) {
  return Roadmap.findOne({ userId }).sort({ createdAt: -1, _id: -1 });
}

export function calculateProgress(roadmap) {
  let totalTopics = 0;
  let completedTopics = 0;
  let nextTopic = null;

  const modules = roadmap.modules.map((module, moduleIdx) => {
    const moduleTopics = module.topics || [];
    const completedInModule = moduleTopics.filter((topic) => topic.completed).length;
    totalTopics += moduleTopics.length;
    completedTopics += completedInModule;

    moduleTopics.forEach((topic, topicIdx) => {
      if (!topic.completed && !nextTopic) {
        nextTopic = {
          moduleIdx,
          topicIdx,
          title: topic.title,
        };
      }
    });

    return {
      title: module.title,
      percent: moduleTopics.length
        ? Math.round((completedInModule / moduleTopics.length) * 100)
        : 0,
    };
  });

  return {
    overallPercent: totalTopics
      ? Math.round((completedTopics / totalTopics) * 100)
      : 0,
    completedTopics,
    totalTopics,
    modules,
    nextTopic,
  };
}

export function expandRoadmapResources(roadmap) {
  const data = roadmap.toObject ? roadmap.toObject() : roadmap;
  const { _id, __v, userId, ...publicRoadmap } = data;

  return {
    ...publicRoadmap,
    id: _id?.toString(),
    modules: publicRoadmap.modules.map((module) => ({
      ...module,
      topics: module.topics.map((topic) => ({
        ...topic,
        resources: expandResourceIds(topic.resourceIds),
      })),
    })),
  };
}
