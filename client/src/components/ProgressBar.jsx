export default function ProgressBar({ percent = 0, label = 'Progress', showLabel = true }) {
  const numericPercent = Number(percent);
  const value = Number.isFinite(numericPercent)
    ? Math.round(Math.max(0, Math.min(100, numericPercent)))
    : 0;

  return (
    <div>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="font-semibold text-indigo-700">{value}%</span>
        </div>
      )}
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
