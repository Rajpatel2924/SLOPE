import Chat from '../models/Chat.js';
import { generateStudyReply } from '../services/aiService.js';
import { calculateProgress, getLatestRoadmap } from '../services/roadmapService.js';

async function appendExchange(userId, message, reply, sentAt) {
  const update = {
    $push: {
      messages: {
        $each: [
          { role: 'user', content: message, at: sentAt },
          { role: 'assistant', content: reply, at: new Date() },
        ],
        $slice: -50,
      },
    },
  };
  const options = { upsert: true, runValidators: true, setDefaultsOnInsert: false };

  try {
    // Append and cap together so concurrent requests cannot overwrite history.
    await Chat.updateOne({ userId }, update, options);
  } catch (error) {
    if (error.code !== 11000) throw error;
    await Chat.updateOne({ userId }, update, { runValidators: true });
  }
}

export async function sendMessage(req, res, next) {
  try {
    const sentAt = new Date();
    const userId = req.user._id;
    const [chat, roadmap] = await Promise.all([
      Chat.findOne({ userId }).select('messages -_id').lean(),
      getLatestRoadmap(userId),
    ]);
    const currentTopic = roadmap
      ? calculateProgress(roadmap).nextTopic?.title || 'Roadmap review and interview practice'
      : 'General learning and career preparation';

    const reply = await generateStudyReply({
      message: req.body.message,
      history: chat?.messages || [],
      goal: roadmap?.goal || 'Engineering fundamentals and placement preparation',
      level: roadmap?.level || 'beginner',
      currentTopic,
    });

    await appendExchange(userId, req.body.message, reply, sentAt);
    return res.json({ reply });
  } catch (error) {
    return next(error);
  }
}

export async function getChatHistory(req, res, next) {
  try {
    const chat = await Chat.findOne({ userId: req.user._id })
      .select('messages -_id')
      .lean();
    return res.json({ messages: (chat?.messages || []).slice(-50) });
  } catch (error) {
    return next(error);
  }
}
