import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import ChatWindow from '../components/ChatWindow.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [reload, setReload] = useState(0);
  const inputRef = useRef(null);
  const pendingRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    Promise.all([
      api.get('/chat', { signal: controller.signal }),
      api.get('/roadmap', { signal: controller.signal }).catch((error) => {
        if (error.response?.status === 404) return { data: { roadmap: null } };
        throw error;
      }),
    ])
      .then(([historyResponse, roadmapResponse]) => {
        if (controller.signal.aborted) return;
        setMessages(historyResponse.data.messages.slice(-50));
        setRoadmap(roadmapResponse.data.roadmap);
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  async function sendMessage() {
    const question = draft.trim();
    if (!question || loading || loadError || pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    const previousMessages = messages;
    setSendError(null);
    setSending(true);
    setDraft('');
    setMessages((current) => [...current, {
      id: crypto.randomUUID(), role: 'user', content: question, at: new Date().toISOString(),
    }]);

    try {
      const { data } = await api.post('/chat', { message: question }, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setMessages((current) => [...current, {
          id: crypto.randomUUID(), role: 'assistant', content: data.reply, at: new Date().toISOString(),
        }].slice(-50));
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages(previousMessages);
        setDraft(question);
        setSendError(error);
      }
    } finally {
      if (!controller.signal.aborted) {
        pendingRequest.current = null;
        setSending(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  }

  const currentTopic = roadmap?.modules.flatMap((module) => module.topics).find((topic) => !topic.completed)?.title || 'Roadmap review and interview practice';

  return (
    <section className="page-shell max-w-5xl space-y-6 py-10 sm:py-14">
      <header><p className="eyebrow">Your AI study assistant</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Let’s make it click</h1><p className="mt-3 text-slate-600">Ask a focused question about your learning path or placement preparation.</p></header>
      {loading ? <Loader message="Loading your conversation..." /> : loadError ? (
        <ErrorMessage error={loadError} onRetry={() => setReload(reload + 1)} />
      ) : (
        <>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            {roadmap ? <><p><span className="font-semibold">Goal:</span> {roadmap.goal} · <span className="capitalize">{roadmap.level}</span></p><p className="mt-1"><span className="font-semibold">Current topic:</span> {currentTopic}</p></> : <p>You can ask general learning and career questions now, or <Link to="/onboarding" className="font-semibold underline underline-offset-4">create a roadmap</Link> for topic-specific help.</p>}
          </div>
          <ChatWindow messages={messages} sending={sending} value={draft} onChange={setDraft} onSend={sendMessage} error={sendError} inputRef={inputRef} />
        </>
      )}
    </section>
  );
}
