export default function Loader({ message = 'Loading...', compact = false }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 text-slate-600 ${compact ? 'py-2' : 'py-12'}`}>
      <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
