import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setMissing(false);
    Promise.all([
      api.get('/roadmap', { signal: controller.signal }),
      api.get('/progress', { signal: controller.signal }),
    ])
      .then(([roadmapResponse, progressResponse]) => {
        if (controller.signal.aborted) return;
        setRoadmap(roadmapResponse.data.roadmap);
        setProgress(progressResponse.data);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        if (requestError.response?.status === 404) setMissing(true);
        else setError(requestError);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  if (loading) return <Loader message="Loading your progress..." />;
  if (error) return <section className="page-shell py-10"><ErrorMessage error={error} onRetry={() => setReload(reload + 1)} /></section>;
  if (missing || !roadmap || !progress) return (
    <section className="page-shell py-12"><div className="card"><h1 className="text-2xl font-bold">Welcome, {user.name.split(' ')[0]}</h1><p className="mt-3 text-slate-600">Build your first roadmap to start tracking your learning progress.</p><Link to="/onboarding" className="btn btn-primary mt-6">Create my roadmap</Link></div></section>
  );

  const remaining = Math.max(0, progress.totalTopics - progress.completedTopics);
  const weeksLeft = progress.totalTopics ? Math.ceil(remaining / progress.totalTopics * roadmap.totalWeeks) : 0;
  const stats = [
    ['Completed topics', progress.completedTopics],
    ['Remaining topics', remaining],
    ['Weeks left estimate', weeksLeft],
  ];
  const next = progress.nextTopic;
  const nextModule = next ? roadmap.modules[next.moduleIdx] : null;
  const nextTopic = nextModule?.topics[next.topicIdx];
  const chartData = progress.modules.map((module) => ({
    ...module,
    shortTitle: module.title.length > 22 ? `${module.title.slice(0, 21)}…` : module.title,
  }));

  return (
    <section className="page-shell space-y-6 py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Learning dashboard</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome back, {user.name.split(' ')[0]}</h1><p className="mt-3 text-slate-600">{roadmap.goal} · {roadmap.hoursPerWeek} hours/week · {roadmap.totalWeeks}-week plan</p></div>
        <Link to="/roadmap" className="btn btn-secondary">View roadmap</Link>
      </header>
      <div className="card"><ProgressBar percent={progress.overallPercent} label="Overall progress" /><p className="mt-3 text-sm text-slate-500">{progress.completedTopics} of {progress.totalTopics} topics completed</p></div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => <div key={label} className="card"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="mt-3 text-3xl font-bold text-slate-900">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-slate-500">The weeks-left estimate assumes an even workload and is based on remaining topics, not calendar time.</p>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card min-w-0" aria-labelledby="module-chart-title">
          <h2 id="module-chart-title" className="text-xl font-bold">Progress by module</h2>
          <div className="mt-5 min-w-0" style={{ height: Math.max(240, chartData.length * 56) }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 300, height: 240 }}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 16, bottom: 5, left: 0 }} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="shortTitle" width={100} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Completed']} labelFormatter={(label, payload) => payload[0]?.payload.title || label} cursor={{ fill: '#eef2ff' }} />
                <Bar dataKey="percent" fill="#4f46e5" radius={[0, 5, 5, 0]} barSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">{progress.modules.map((module, index) => <li key={index}>{module.title}: {module.percent}% complete</li>)}</ul>
        </section>
        <section className="card self-start border-indigo-200" aria-labelledby="next-topic-title">
          <p className="eyebrow">{next ? 'Up next' : 'Learning milestone'}</p>
          <h2 id="next-topic-title" className="mt-3 text-xl font-bold">{next ? next.title : 'Your roadmap is complete!'}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{next ? nextTopic?.description : 'You completed every topic. Review your projects and revisit any subjects you want to strengthen.'}</p>
          {nextModule && <p className="mt-4 text-xs font-medium text-indigo-700">{nextModule.title} · Weeks {nextModule.weekStart}–{nextModule.weekEnd}</p>}
          <Link to={next ? `/roadmap?module=${next.moduleIdx}#topic-${next.moduleIdx}-${next.topicIdx}` : '/roadmap'} className="btn btn-primary mt-6">{next ? 'Continue learning →' : 'Review completed roadmap'}</Link>
        </section>
      </div>
    </section>
  );
}
