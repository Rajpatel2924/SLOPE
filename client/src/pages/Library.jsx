import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useBookmarks } from '../context/BookmarkContext.jsx';
import ResourceLink from '../components/ResourceLink.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

export default function Library() {
  const { bookmarks, loading: bookmarksLoading, error: bookmarksError, retry } = useBookmarks();
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    Promise.all([api.get('/library/notes', { params: { search: query }, signal: controller.signal }), api.get('/library/reminders', { signal: controller.signal })])
      .then(([notebook, alerts]) => { if (!controller.signal.aborted) { setNotes(notebook.data.notes); setReminders(alerts.data.reminders); setEmailAvailable(alerts.data.emailConfigured); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, reload]);
  useEffect(() => {
    const timer = setInterval(() => setReload((current) => current + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  async function markRead(id) {
    try { const { data } = await api.patch(`/library/reminders/${id}/read`); setReminders((current) => current.map((entry) => entry.id === id ? { ...entry, readAt: data.readAt } : entry)); }
    catch (requestError) { setError(requestError); }
  }
  return <section className="page-shell space-y-6 py-10">
    <header><p className="eyebrow">Keep what helps</p><h1 className="mt-3 text-3xl font-bold">My learning library</h1><p className="mt-3 text-slate-600">Your topic notes, saved resources, and study reminders.</p></header>
    <ErrorMessage error={error} onRetry={() => setReload(reload + 1)} /><ErrorMessage error={bookmarksError} onRetry={retry} />
    <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Study reminders</h2><Link to="/account" className="btn btn-secondary">Reminder settings</Link></div><p className="mt-3 text-sm text-slate-500">{emailAvailable ? 'Email delivery is configured. Due reminders can also arrive by email.' : 'Reminders are available in-app. Email delivery is not configured on this site yet.'}</p>{!reminders.length ? <p className="mt-4 text-sm text-slate-600">No reminders yet. Enable them in Account settings and choose a time on your study days.</p> : <ul className="mt-4 space-y-3">{reminders.map((reminder) => <li key={reminder.id} className={`rounded-xl border p-4 ${reminder.readAt ? 'border-slate-200' : 'border-indigo-200 bg-indigo-50'}`}><p className="text-sm">{reminder.message}</p><div className="mt-3 flex flex-wrap gap-3"><Link to="/study-plan" className="btn btn-secondary">Open daily plan</Link>{!reminder.readAt && <button className="btn btn-secondary" onClick={() => markRead(reminder.id)}>Mark read</button>}</div></li>)}</ul>}</section>
    <section className="card"><h2 className="text-xl font-bold">Topic notes</h2><form className="mt-4 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}><label htmlFor="note-search" className="sr-only">Search notes</label><input id="note-search" className="field min-w-0 flex-1" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles or note text" /><button className="btn btn-secondary">Search</button></form>{loading ? <Loader message="Loading library…" /> : !notes.length ? <p className="mt-4 text-sm text-slate-600">{query ? 'No notes match your search.' : 'Open a topic in your roadmap and select Topic notes to start writing.'}</p> : <ul className="mt-4 space-y-4">{notes.map((note) => <li key={note.id} className="rounded-xl border border-slate-200 p-4"><Link to={`/notes/${note.roadmapId}/${note.moduleIdx}/${note.topicIdx}`} className="font-bold text-indigo-700 underline">{note.topicTitle}</Link><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{note.content}</p><p className="mt-3 text-xs text-slate-500">Updated {new Date(note.updatedAt).toLocaleString()}</p></li>)}</ul>}</section>
    <section className="card"><h2 className="text-xl font-bold">Bookmarked resources</h2>{bookmarksLoading ? <Loader message="Loading bookmarks…" /> : !bookmarks.length ? <p className="mt-4 text-sm text-slate-600">Save a resource from your roadmap to find it here later.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{bookmarks.map((bookmark) => <ResourceLink key={bookmark.resource.id} resource={bookmark.resource} />)}</div>}</section>
  </section>;
}
