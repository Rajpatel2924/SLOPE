import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const topicSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(300),
  resourceIds: z.array(z.string().trim().min(1)).max(3).optional().default([]),
}).strict();

const moduleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  weekStart: z.number().int().min(1),
  weekEnd: z.number().int().min(1),
  topics: z.array(topicSchema).min(3).max(6),
}).strict();

export const aiRoadmapSchema = z.object({
  modules: z.array(moduleSchema).min(3).max(8),
}).strict();

function createClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
  });
}

function generationConfig(maxOutputTokens) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return {
    model,
    config: {
      maxOutputTokens,
      temperature: 0.4,
      ...(model.startsWith('gemini-2.5-flash')
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {}),
    },
  };
}

function stripCodeFences(value) {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmedValue;
}

function createRoadmapPrompt(input, resources) {
  const resourceSummary = resources.map(({ id, title, topic, level, type }) => ({
    id,
    title,
    topic,
    level,
    type,
  }));

  return `You are an expert learning-path planner for engineering students in India.
Create a personalized roadmap.

Goal: ${input.goal}
Current level: ${input.level}
Available time: ${input.hoursPerWeek} hours/week for ${input.totalWeeks} weeks.

RULES:
- Split the roadmap into 3 to 8 modules covering weeks 1..${input.totalWeeks} without gaps or overlaps.
- Each module has 3 to 6 topics, ordered from fundamentals to advanced.
- Workload per module must fit ${input.hoursPerWeek} hours/week.
- For each topic, attach 1 to 3 resource IDs chosen ONLY from the list below. Never invent IDs or URLs.
- Include a short, actionable description (max 25 words) per topic.
- Include at least one mini-project topic in the last third of the roadmap.

RESOURCE LIBRARY (id, title, topic, level, type):
${JSON.stringify(resourceSummary)}

Return ONLY valid JSON in exactly this shape:
{"modules":[{"title":"","weekStart":1,"weekEnd":2,"topics":[{"title":"","description":"","resourceIds":["r1"]}]}]}`;
}

export function parseRoadmapResponse(text) {
  if (!text) {
    throw new Error('Gemini returned an empty roadmap response.');
  }

  let parsedResponse;

  try {
    parsedResponse = JSON.parse(stripCodeFences(text));
  } catch (error) {
    throw new Error('Gemini returned invalid roadmap JSON.');
  }

  return aiRoadmapSchema.parse(parsedResponse);
}

export async function generateRoadmapWithAI(input, resources) {
  const ai = createClient();
  const { model, config } = generationConfig(8192);
  const response = await ai.models.generateContent({
    model,
    contents: createRoadmapPrompt(input, resources),
    config: {
      ...config,
      responseMimeType: 'application/json',
    },
  });

  return parseRoadmapResponse(response.text);
}

export async function generateStudyReply({ message, history, goal, level, currentTopic }) {
  try {
    const ai = createClient();
    const { model, config } = generationConfig(600);
    const contents = history.slice(-8).map(({ role, content }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        ...config,
        systemInstruction: `You are SLOPE's study assistant. The student's goal is ${goal}, level ${level}, and they are currently on the topic '${currentTopic}'. Explain step by step, concisely, with small code examples where relevant. If a question is unrelated to learning or career preparation, politely redirect. Do not claim to have verified external links. Keep replies within about 600 tokens.`,
      },
    });

    const reply = response.text?.trim();
    if (!reply) throw new Error('Empty assistant response.');
    return reply;
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 'unavailable';
    console.error(`Study assistant generation failed (provider status: ${status}).`);
    const unavailable = new Error('The study assistant is temporarily unavailable. Please try again in a moment.');
    unavailable.statusCode = 503;
    unavailable.expose = true;
    throw unavailable;
  }
}
