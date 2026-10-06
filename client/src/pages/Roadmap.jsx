import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';
import ModuleAccordion from '../components/ModuleAccordion.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

function updateTopic(roadmap, roadmapId, moduleIdx, topicIdx, fields) {
  if (!roadmap || roadmap.id !== roadmapId) return roadmap;
  return {
    ...roadmap,
    modules: roadmap.modules.map((module, index) => index !== moduleIdx ? module : {
      ...module,
      topics: module.topics.map((topic, index) => index !== topicIdx ? topic : { ...topic, ...fields }),
    }),
  };
}

export default function Roadmap() {
  const navigate = useNavigate();
  const { hash, state } = useLocation();
  const [searchParams] = useSearchParams();
  const requestedModule = searchParams.get('module');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [reload, setReload] = useState(0);
  const [openModules, setOpenModules] = useState(new Set());
  const [pendingTopics, setPendingTopics] = useState(new Set());
  const requests = useRef(new Map());
  const scrolledTo = useRef('');

  useEffect(() => {
    const controller = new AbortController();
    const activeRequests = requests.current;
    setLoading(true);
    setError(null);
    setMissing(false);
    setPendingTopics(new Set());
    api.get('/roadmap', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setRoadmap(data.roadmap);
        const index = Number(requestedModule);
        const firstIncomplete = data.roadmap.modules.findIndex((module) => module.topics.some((topic) => !topic.completed));
        const selected = requestedModule !== null && Number.isInteger(index) && index >= 0 && index < data.roadmap.modules.length
          ? index : Math.max(0, firstIncomplete);
        setOpenModules(new Set([selected]));
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (requestError.response?.status === 404) setMissing(true);
        else setError(requestError);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => {
      controller.abort();
      activeRequests.forEach((request) => request.abort());
      activeRequests.clear();
    };
  }, [reload, requestedModule]);

  useEffect(() => {
    const key = `${roadmap?.id}:${hash}`;
    if (!hash.startsWith('#topic-') || scrolledTo.current === key) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (target?.getClientRects().length) {
        target.scrollIntoView({ block: 'center' });
        scrolledTo.current = key;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [roadmap?.id, hash, openModules]);

  async function toggleTopic(moduleIdx, topicIdx, completed) {
    const key = `${moduleIdx}:${topicIdx}`;
    if (requests.current.has(key)) return;
    const previous = roadmap.modules[moduleIdx].topics[topicIdx];
    const roadmapId = roadmap.id;
    const controller = new AbortController();
    requests.current.set(key, controller);
    setSaveError(null);
    setPendingTopics((current) => new Set(current).add(key));
    setRoadmap((current) => updateTopic(current, roadmapId, moduleIdx, topicIdx, {
      completed, completedAt: completed ? new Date().toISOString() : null,
    }));
    try {
      await api.patch(`/roadmap/topic/${moduleIdx}/${topicIdx}`, { completed }, { signal: controller.signal });
    } catch (requestError) {
      if (!controller.signal.aborted) {
        // Restore only this topic; preserve any other in-flight checkbox changes.
        setRoadmap((current) => updateTopic(current, roadmapId, moduleIdx, topicIdx, {
          completed: previous.completed, completedAt: previous.completedAt,
        }));
        setSaveError(requestError);
      }
    } finally {
      if (!controller.signal.aborted) {
        requests.current.delete(key);
        setPendingTopics((current) => { const next = new Set(current); next.delete(key); return next; });
      }
    }
  }

  function regenerate() {
    if (!window.confirm('Generate a new roadmap? Your active checklist will be replaced with a fresh learning path.')) return;
    const { goal, level, hoursPerWeek, totalWeeks } = roadmap;
    navigate('/onboarding', { state: { profile: { goal, level, hoursPerWeek, totalWeeks } } });
  }

  if (loading) return <Loader message="Loading your roadmap..." />;
  if (error) return <section className="page-shell py-10"><ErrorMessage error={error} onRetry={() => setReload(reload + 1)} /></section>;
  if (missing || !roadmap) return (
    <section className="page-shell py-12"><div className="card"><h1 className="text-2xl font-bold">Your roadmap starts with a goal</h1><p className="mt-3 text-slate-600">Create a learning profile to get your first weekly plan.</p><Link to="/onboarding" className="btn btn-primary mt-6">Build my roadmap</Link></div></section>
  );

  const topics = roadmap.modules.flatMap((module) => module.topics);
  const completed = topics.filter((topic) => topic.completed).length;
  const percent = topics.length ? Math.round(completed / topics.length * 100) : 0;

  return (
    <section className="page-shell space-y-6 py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Your learning roadmap</p><h1 className="mt-3 text-3xl font-bold tracking-tight">{roadmap.goal}</h1><p className="mt-3 text-sm text-slate-600"><span className="capitalize">{roadmap.level}</span> · {roadmap.hoursPerWeek} hours/week · {roadmap.totalWeeks} weeks</p></div>
        <button type="button" onClick={regenerate} disabled={pendingTopics.size > 0} className="btn btn-secondary">Regenerate roadmap</button>
      </header>
      {roadmap.source === 'fallback' && <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">{state?.notice || 'AI generation was unavailable, so this path uses our curated fallback roadmap. You can start learning right away.'}</p>}
      <div className="card"><ProgressBar percent={percent} label="Overall progress" /><p className="mt-3 text-sm text-slate-500">{completed} of {topics.length} topics completed</p></div>
      {saveError && <div className="space-y-2"><p className="text-sm font-semibold text-slate-700">Your topic update could not be saved. The checkbox has been restored.</p><ErrorMessage error={saveError} /></div>}
      <div className="space-y-4">
        {roadmap.modules.map((module, moduleIdx) => (
          <ModuleAccordion key={`${roadmap.id}-${moduleIdx}`} module={module} moduleIdx={moduleIdx} open={openModules.has(moduleIdx)} pendingTopics={pendingTopics} onToggleTopic={toggleTopic} onToggleOpen={() => setOpenModules((current) => { const next = new Set(current); if (next.has(moduleIdx)) next.delete(moduleIdx); else next.add(moduleIdx); return next; })} />
        ))}
      </div>
      <Link to="/dashboard" className="btn btn-secondary">View progress dashboard →</Link>
    </section>
  );
}
