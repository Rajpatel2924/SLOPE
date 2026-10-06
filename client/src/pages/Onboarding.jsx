import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

const goals = ['Web Developer', 'DSA & Placements', 'AI/ML Engineer'];
const durations = [4, 6, 8, 10, 12, 16];

export default function Onboarding() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const profile = state?.profile;
  const [form, setForm] = useState({
    goal: profile?.goal || '',
    level: profile?.level || 'beginner',
    hoursPerWeek: Math.min(40, Math.max(1, profile?.hoursPerWeek || 10)),
    totalWeeks: durations.includes(profile?.totalWeeks) ? profile.totalWeeks : 8,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const generationRequest = useRef(null);

  useEffect(() => () => generationRequest.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (generationRequest.current) return;
    setError(null);
    if (form.goal.trim().length < 3) {
      setError('Enter a learning goal with at least 3 characters.');
      return;
    }

    const controller = new AbortController();
    generationRequest.current = controller;
    setGenerating(true);
    try {
      const { data } = await api.post('/roadmap/generate', {
        ...form,
        goal: form.goal.trim(),
      }, { signal: controller.signal });
      if (!controller.signal.aborted) {
        navigate('/roadmap', { replace: true, state: { notice: data.notice } });
      }
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError);
    } finally {
      if (!controller.signal.aborted) {
        generationRequest.current = null;
        setGenerating(false);
      }
    }
  }

  return (
    <section className="page-shell max-w-3xl py-10 sm:py-14">
      <p className="eyebrow">Your learning profile</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Build your learning roadmap</h1>
      <p className="mt-4 text-slate-600">Choose a goal and a realistic weekly schedule. We’ll turn them into an ordered learning path with curated resources.</p>
      <form onSubmit={handleSubmit} className="card mt-8 space-y-6" aria-busy={generating}>
        <ErrorMessage error={error} />
        <fieldset disabled={generating} className="space-y-6">
          <legend className="sr-only">Learning preferences</legend>
          <div>
            <label htmlFor="learning-goal" className="label">What do you want to learn?</label>
            <input id="learning-goal" name="goal" className="field" required minLength={3} maxLength={200} value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} aria-describedby="goal-help" />
            <p id="goal-help" className="mt-2 text-xs text-slate-500">Be specific, or choose one of these popular goals.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {goals.map((goal) => (
                <button type="button" key={goal} aria-pressed={form.goal === goal} onClick={() => setForm({ ...form, goal })} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${form.goal === goal ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{goal}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="learning-level" className="label">Current level</label>
            <select id="learning-level" className="field" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
              <option value="beginner">Beginner — starting with the fundamentals</option>
              <option value="intermediate">Intermediate — comfortable with the basics</option>
              <option value="advanced">Advanced — ready for deeper practice</option>
            </select>
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="weekly-hours" className="label mb-0">Hours per week</label>
              <output htmlFor="weekly-hours" className="text-sm font-bold text-indigo-700">{form.hoursPerWeek} hours/week</output>
            </div>
            <input id="weekly-hours" type="range" min={1} max={40} step={1} value={form.hoursPerWeek} className="mt-3 h-11 w-full accent-indigo-700" onChange={(event) => setForm({ ...form, hoursPerWeek: Number(event.target.value) })} />
            <div aria-hidden="true" className="flex justify-between text-xs text-slate-500"><span>1 hour</span><span>40 hours</span></div>
          </div>
          <div>
            <label htmlFor="learning-duration" className="label">Duration in weeks</label>
            <select id="learning-duration" className="field" value={form.totalWeeks} onChange={(event) => setForm({ ...form, totalWeeks: Number(event.target.value) })}>
              {durations.map((weeks) => <option key={weeks} value={weeks}>{weeks} weeks</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary w-full">{generating ? 'Building your roadmap...' : 'Generate my roadmap →'}</button>
        </fieldset>
        {generating && (
          <div className="rounded-xl bg-indigo-50 p-4 text-center">
            <Loader message="Building your roadmap..." compact />
            <p className="mt-1 text-xs text-slate-600">Generation can take up to a minute. Keep this page open while we create your path.</p>
          </div>
        )}
      </form>
    </section>
  );
}
