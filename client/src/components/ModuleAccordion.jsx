import ResourceLink from './ResourceLink.jsx';
import { Link } from 'react-router-dom';

export default function ModuleAccordion({ roadmapId, module, moduleIdx, open, onToggleOpen, onToggleTopic, pendingTopics }) {
  const completed = module.topics.filter((topic) => topic.completed).length;
  const percent = module.topics.length ? Math.round(completed / module.topics.length * 100) : 0;
  const panelId = `module-panel-${moduleIdx}`;
  const headingId = `module-heading-${moduleIdx}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2>
        <button id={headingId} type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggleOpen} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 sm:p-6">
          <span className="min-w-0">
            <span className="eyebrow">Module {moduleIdx + 1} · Weeks {module.weekStart}–{module.weekEnd}</span>
            <span className="mt-2 block text-lg font-bold text-slate-900">{module.title}</span>
            <span className="mt-1 block text-xs text-slate-500">{completed} of {module.topics.length} topics complete</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-bold text-indigo-700">{percent}%</span>
            <span aria-hidden="true" className="text-xl text-slate-500">{open ? '−' : '+'}</span>
          </span>
        </button>
      </h2>
      <div id={panelId} role="region" aria-labelledby={headingId} hidden={!open} className="border-t border-slate-200 p-4 sm:p-6">
        <ol className="space-y-5">
          {module.topics.map((topic, topicIdx) => {
            const key = `${moduleIdx}:${topicIdx}`;
            const pending = pendingTopics.has(key);
            const topicId = `topic-${moduleIdx}-${topicIdx}`;
            return (
              <li id={topicId} key={topicId} className="scroll-mt-6 rounded-xl border border-slate-200 p-4">
                <label htmlFor={`${topicId}-checkbox`} className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input id={`${topicId}-checkbox`} type="checkbox" aria-label={topic.title} checked={topic.completed} disabled={pending} onChange={(event) => onToggleTopic(moduleIdx, topicIdx, event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-indigo-700 disabled:cursor-wait" />
                  <span className={`font-semibold ${topic.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{topic.title}</span>
                </label>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{topic.description}</p>
                {topic.reviewRequired && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Revision recommended: {topic.reviewReason}</p>}
                <p className="mt-2 text-xs font-medium text-indigo-700" aria-live="polite">{pending ? 'Saving...' : topic.completed ? 'Completed' : 'Ready to learn'}</p>
                <div className="mt-4 grid gap-2 lg:grid-cols-2">
                  {topic.resources.map((resource) => <ResourceLink key={resource.id} resource={resource} />)}
                </div>
                <div className="mt-4 flex flex-wrap gap-3"><Link to={`/quizzes?module=${moduleIdx}&topic=${topicIdx}`} className="btn btn-secondary">Check understanding</Link><Link to={`/notes/${roadmapId}/${moduleIdx}/${topicIdx}`} className="btn btn-secondary">Topic notes</Link></div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
