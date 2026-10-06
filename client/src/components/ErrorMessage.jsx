import { getErrorMessage } from '../api.js';

export default function ErrorMessage({ error, onRetry }) {
  if (!error) return null;
  const details = error?.response?.data?.error?.details || [];

  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p className="font-semibold">{getErrorMessage(error)}</p>
      {details.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {details.map((detail, index) => (
            <li key={`${detail.path}-${index}`}>{detail.message}</li>
          ))}
        </ul>
      )}
      {onRetry && <button type="button" onClick={onRetry} className="mt-3 min-h-11 font-semibold underline underline-offset-4">Try again</button>}
    </div>
  );
}
