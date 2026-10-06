import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../api.js';
import { useAuth } from './AuthContext.jsx';

const BookmarkContext = createContext(null);

export function BookmarkProvider({ children }) {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(new Set());
  const requests = useRef(new Set());
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBookmarks([]); setError(null);
    if (!user?.id) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    api.get('/library/bookmarks', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setBookmarks(data.bookmarks); })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, reload]);

  async function toggle(resource) {
    if (!user || loading || error || requests.current.has(resource.id)) return;
    const owner = user.id;
    const saved = bookmarks.some((bookmark) => bookmark.resource.id === resource.id);
    requests.current.add(resource.id); setPending((current) => new Set(current).add(resource.id));
    try {
      if (saved) await api.delete(`/library/bookmarks/${resource.id}`);
      else await api.put(`/library/bookmarks/${resource.id}`);
      if (currentUser.current !== owner) return;
      setBookmarks((current) => saved ? current.filter((bookmark) => bookmark.resource.id !== resource.id) : [{ id: resource.id, resource }, ...current]);
    } catch (requestError) { if (currentUser.current === owner) setError(requestError); }
    finally { requests.current.delete(resource.id); setPending((current) => { const next = new Set(current); next.delete(resource.id); return next; }); }
  }
  return <BookmarkContext.Provider value={{ bookmarks, loading, error, pending, toggle, retry: () => setReload((current) => current + 1) }}>{children}</BookmarkContext.Provider>;
}

export const useBookmarks = () => useContext(BookmarkContext);
