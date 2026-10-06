import BookmarkButton from './BookmarkButton.jsx';

const typeLabels = {
  video: 'Video',
  docs: 'Docs',
  course: 'Course',
  practice: 'Practice',
  article: 'Article',
};

export default function ResourceLink({ resource }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"><a href={resource.url} target="_blank" rel="noopener noreferrer" className="group flex flex-1 items-start gap-3 p-4 transition-colors hover:bg-indigo-50/50">
      <span className="mt-0.5 shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800">{typeLabels[resource.type] || 'Resource'}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800 group-hover:text-indigo-800">{resource.title}</span>
        <span className="mt-1 block text-xs capitalize text-slate-500">{resource.topic.replace(/-/g, ' ')} · {resource.level}</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </span>
      <span aria-hidden="true" className="text-lg text-slate-400 group-hover:text-indigo-700">↗</span>
    </a><BookmarkButton resource={resource} /></div>
  );
}
