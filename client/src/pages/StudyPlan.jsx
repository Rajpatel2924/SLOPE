import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function StudyPlan() {
  const [plan, setPlan] = useState(null);
  const [days, setDays] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setMissing(false);
    Promise.all([api.get('/study-plan', { params: date ? { date } : {}, signal: controller.signal }), api.get('/study-plan/upcoming', { signal: controller.signal })])
      .then(([response, upcoming]) => { if (!controller.signal.aborted) { setPlan(response.data); setDays(upcoming.data.days); } })
      .catch((requestError) => { if (!controller.signal.aborted) { if (requestError.response?.status === 404) setMissing(true); else setError(requestError); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, reload]);

  async function complete(task) {
    if (pending) return;
    setPending(task.id); setError(null);
    try { const { data } = await api.patch(`/study-plan/${plan.id}/tasks/${task.id}`, { completed: !task.completed }); setPlan(data); }
    catch (requestError) { setError(requestError); }
    finally { setPending(''); }
  }

  if (loading) return <Loader message="Planning your study day…" />;
  if (missing) return <section className="page-shell py-10"><div className="card"><h1 className="text-2xl font-bold">Start with a roadmap</h1><p className="mt-3 text-slate-600">Your daily tasks will follow your learning path.</p><Link to="/onboarding" className="btn btn-primary mt-5">Create roadmap</Link></div></section>;
  return <section className="page-shell space-y-6 py-10">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">One day at a time</p><h1 className="mt-3 text-3xl font-bold">Daily study plan</h1><p className="mt-3 text-slate-600">Small, focused sessions based on your roadmap and study preferences.</p></div><Link to="/account" className="btn btn-secondary">Study preferences</Link></header>
    <ErrorMessage error={error} onRetry={() => setReload(reload + 1)} />
    <div className="flex flex-wrap gap-2" aria-label="Upcoming study days">{days.map((day) => <button key={day.date} onClick={() => setDate(day.date)} disabled={Boolean(pending)} aria-pressed={plan?.date === day.date} className={`btn ${plan?.date === day.date ? 'btn-primary' : 'btn-secondary'}`}>{day.date.slice(5)} · {day.budgetMinutes ? `${day.budgetMinutes} min` : 'Rest'}</button>)}</div>
    {plan && <>
      <div className="card"><h2 className="text-xl font-bold">{plan.date} · {plan.plannedMinutes} minutes planned</h2><p className="mt-2 text-sm text-slate-500">{plan.timezone} · Time estimates are planning guidance, not tracked study time.</p><div className="mt-5"><ProgressBar percent={plan.plannedMinutes ? Math.round(plan.completedMinutes / plan.plannedMinutes * 100) : 0} label="Daily tasks completed" /></div></div>
      {!plan.tasks.length && <div className="card"><h2 className="text-xl font-bold">{plan.budgetMinutes ? 'Your roadmap is complete' : 'A planned rest day'}</h2><p className="mt-3 text-slate-600">{plan.budgetMinutes ? 'Review a topic or create your next learning goal.' : 'Rest, or revisit a topic in your roadmap. Your next study day is shown above.'}</p><Link to="/roadmap" className="btn btn-secondary mt-5">View roadmap</Link></div>}
      <ol className="space-y-4">{plan.tasks.map((task) => <li key={task.id} className="card flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="eyebrow">{task.kind === 'review' ? 'Revision' : 'Study session'} · {task.minutes} min</p><h2 className={`mt-3 text-lg font-bold ${task.completed ? 'text-slate-500 line-through' : ''}`}>{task.title}</h2>{task.carriedFrom && <p className="mt-2 text-sm text-amber-700">Carried forward from {task.carriedFrom}</p>}<Link to={`/roadmap?module=${task.moduleIdx}#topic-${task.moduleIdx}-${task.topicIdx}`} className="mt-3 inline-block min-h-11 py-2 text-sm font-semibold text-indigo-700 underline">Open topic and resources</Link></div><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-indigo-700" checked={task.completed} disabled={Boolean(pending) || plan.date > days[0]?.date} onChange={() => complete(task)} />{pending === task.id ? 'Saving…' : task.completed ? 'Completed' : 'Mark studied'}</label></li>)}</ol>
    </>}
  </section>;
}
