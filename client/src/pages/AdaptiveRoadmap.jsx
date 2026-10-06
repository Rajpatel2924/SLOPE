import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

export default function AdaptiveRoadmap() {
  const [hours, setHours] = useState(8);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setMissing(false);
    api.get('/roadmap', { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setHours(data.roadmap.hoursPerWeek); })
      .catch((requestError) => { if (!controller.signal.aborted) { if (requestError.response?.status === 404) setMissing(true); else setError(requestError); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function createPreview(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null); setNotice(''); setPreview(null);
    try { const { data } = await api.post('/adaptation/preview', { hoursPerWeek: Number(hours) }); setPreview(data); }
    catch (requestError) { setError(requestError); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (busy) return;
    setBusy(true); setError(null);
    try { const { data } = await api.post(`/adaptation/${preview.id}/apply`); setNotice(data.message); setPreview(null); }
    catch (requestError) { setError(requestError); if (requestError.response?.status === 409) setPreview(null); }
    finally { setBusy(false); }
  }
  if (loading) return <Loader message="Loading your roadmap…" />;
  if (missing) return <section className="page-shell py-10"><div className="card"><h1 className="text-2xl font-bold">Create a roadmap to get started</h1><Link to="/onboarding" className="btn btn-primary mt-5">Create roadmap</Link></div></section>;
  return <section className="page-shell space-y-6 py-10">
    <header><p className="eyebrow">Let your plan evolve</p><h1 className="mt-3 text-3xl font-bold">Adjust your roadmap</h1><p className="mt-3 max-w-3xl text-slate-600">Preview schedule changes based on your latest quiz per topic, unfinished study days, and available time. Completed topics, resources, and topic order are preserved.</p></header>
    <ErrorMessage error={error} onRetry={() => setReload(reload + 1)} />
    {notice && <div role="status" className="card bg-indigo-50"><p>{notice}</p><Link to="/study-plan" className="btn btn-primary mt-4">Open updated daily plan</Link></div>}
    <form onSubmit={createPreview} className="card flex flex-wrap items-end gap-4"><div><label className="label" htmlFor="adaptive-hours">Available hours per week</label><input id="adaptive-hours" className="field" type="number" min={1} max={60} required value={hours} disabled={busy} onChange={(event) => { setHours(event.target.value); setPreview(null); }} /></div><button className="btn btn-primary" disabled={busy}>{busy ? 'Working…' : 'Preview adjustments'}</button></form>
    {preview && <section className="card space-y-5">
      <h2 className="text-xl font-bold">Your proposed plan</h2>
      <div className="grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-slate-50 p-4"><strong>{preview.completedTopicsPreserved}</strong> completed topics preserved</p><p className="rounded-xl bg-slate-50 p-4"><strong>{preview.oldTotalWeeks} → {preview.totalWeeks}</strong> estimated weeks</p><p className="rounded-xl bg-slate-50 p-4"><strong>{preview.missedDays}</strong> unfinished study days in the past week</p></div>
      <p className="text-sm text-slate-600">{preview.oldHoursPerWeek} → {preview.hoursPerWeek} hours/week. Estimates use your preferred session length and 20-minute revision sessions, not measured mastery or tracked time.</p>
      <h3 className="font-bold">Revision recommendations</h3>{preview.reviewTopics.length ? <ul className="space-y-3">{preview.reviewTopics.map((topic) => <li key={`${topic.moduleIdx}:${topic.topicIdx}`} className="rounded-xl bg-amber-50 p-4 text-sm"><strong>{topic.title}</strong><p className="mt-2">{topic.reason}</p></li>)}</ul> : <p className="text-sm text-slate-600">No latest quiz below 70%. Take a topic quiz to add learning evidence.</p>}
      <h3 className="font-bold">Module schedule</h3><ul className="divide-y divide-slate-200">{preview.schedule.map((module, index) => <li key={index} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-semibold">{module.title}</span><span>Weeks {module.oldWeekStart}–{module.oldWeekEnd} → {module.weekStart}–{module.weekEnd}</span></li>)}</ul>
      <p className="text-sm text-slate-500">Applying regenerates daily plans under the new schedule. Preview expires in 30 minutes.</p>
      <div className="flex flex-wrap gap-3"><button onClick={apply} className="btn btn-primary" disabled={busy}>Apply this plan</button><button onClick={() => setPreview(null)} className="btn btn-secondary" disabled={busy}>Keep current plan</button></div>
    </section>}
    <Link to="/roadmap" className="btn btn-secondary">Back to roadmap</Link>
  </section>;
}
