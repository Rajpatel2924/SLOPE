import { useAuth } from '../context/AuthContext.jsx';
import { useBookmarks } from '../context/BookmarkContext.jsx';

export default function BookmarkButton({ resource }) {
  const { user } = useAuth();
  const { bookmarks, loading, error, pending, toggle, retry } = useBookmarks();
  if (!user) return null;
  const saved = bookmarks.some((bookmark) => bookmark.resource.id === resource.id);
  if (error) return <button type="button" className="min-h-11 px-4 py-2 text-sm font-semibold text-red-700" onClick={retry}>Retry loading bookmarks</button>;
  return <button type="button" className="min-h-11 px-4 py-2 text-left text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60" aria-label={`${saved ? 'Remove bookmark for' : 'Bookmark'} ${resource.title}`} aria-pressed={saved} disabled={loading || pending.has(resource.id)} onClick={() => toggle(resource)}>{pending.has(resource.id) ? 'Saving…' : saved ? '★ Saved' : '☆ Save resource'}</button>;
}
