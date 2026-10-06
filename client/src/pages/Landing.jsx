import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';
import ResourceLink from '../components/ResourceLink.jsx';

const categories = {
  'All paths': null,
  'Web development': /html|css|javascript|react|node|express|mongodb|full-stack/,
  'DSA & placements': /arrays|strings|linked|trees|graphs|dsa|sorting|searching|big-o|interview|aptitude|resume/,
  'AI / ML': /python|machine-learning|sql|project-practice/,
};

const steps = [
  ['01', 'Start with your goal', 'Choose a direction and a schedule that fits your week.'],
  ['02', 'Learn with a clear path', 'Work through ordered topics with curated learning resources.'],
  ['03', 'Build steady momentum', 'Track completed topics and ask the study assistant for help.'],
];

export default function Landing() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState('All paths');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api.get('/resources', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResources(data.resources); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const pattern = categories[category];
  const visibleResources = resources.filter((resource) => !pattern || pattern.test(resource.topic)).slice(0, 6);

  return (
    <div className="page-shell">
      <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">A learning environment for engineering students</p>
          <h1 className="mt-5 max-w-2xl text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            {user ? `Welcome, ${user.name.split(' ')[0]}.` : 'Less searching.'}
            <span className="mt-2 block text-indigo-700">More direction.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            {user
              ? 'Your account is ready. Explore trusted resources for your next engineering skill.'
              : 'Turn your engineering goals into a weekly learning path, backed by curated resources and an AI study assistant.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <a href="#resources" className="btn btn-primary">Explore learning resources ↓</a>
            ) : (
              <Link to="/register" className="btn btn-primary">Create your learning account →</Link>
            )}
            {!user && <Link to="/login" className="btn btn-secondary">I already have an account</Link>}
          </div>
          <p className="mt-4 text-sm text-slate-500">Web development · DSA &amp; placements · AI / ML</p>
        </div>
        <aside aria-label="How SLOPE organizes learning" className="card border-indigo-100 p-7 sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-3">
            <p className="font-bold">Your path to progress</p>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">One topic at a time</span>
          </div>
          <ol className="space-y-6">
            {steps.map(([number, title, description]) => (
              <li key={number} className="flex gap-4">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-indigo-700">{number}</span>
                <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p></div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section id="resources" className="scroll-mt-6 border-t border-slate-200 py-12">
        <p className="eyebrow">Curated resource library</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Start with a source you can trust</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Explore docs, courses, and practice resources from the server’s curated catalog.</p>
        <div className="my-6 flex flex-wrap gap-2" aria-label="Filter learning resources">
          {Object.keys(categories).map((name) => (
            <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${category === name ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>{name}</button>
          ))}
        </div>
        {loading ? <Loader message="Loading curated resources..." /> : error ? (
          <ErrorMessage error={error} onRetry={() => setReload(reload + 1)} />
        ) : visibleResources.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visibleResources.map((resource) => <ResourceLink key={resource.id} resource={resource} />)}
          </div>
        ) : <p className="card text-slate-600">No resources match this category yet. Choose another path.</p>}
      </section>
    </div>
  );
}
