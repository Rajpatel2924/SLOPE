import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function NoteEditor() {
  const { roadmapId, moduleIdx, topicIdx } = useParams();
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    api.get('/library/notes/topic', { params: { roadmapId, moduleIdx, topicIdx }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { setTitle(data.topicTitle); setNote(data.note); setContent(data.note?.content || ''); } })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [roadmapId, moduleIdx, topicIdx, reload]);
  useEffect(() => {
    const warn = (event) => { if (content !== (note?.content || '')) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [content, note]);
  async function save(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(null); setNotice('');
    try { const { data } = await api.put('/library/notes/topic', { roadmapId, moduleIdx: Number(moduleIdx), topicIdx: Number(topicIdx), content }); setNote(data.note); setContent(data.note.content); setNotice('Note saved.'); }
    catch (requestError) { setError(requestError); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (saving || !window.confirm('Delete this saved note?')) return;
    setSaving(true); setError(null); setNotice('');
    try { await api.delete(`/library/notes/${note.id}`); setNote(null); setContent(''); setNotice('Note deleted.'); }
    catch (requestError) { setError(requestError); }
    finally { setSaving(false); }
  }
  if (loading) return <Loader message="Loading your topic note…" />;
  return <section className="page-shell space-y-6 py-10"><header><p className="eyebrow">Your learning notebook</p><h1 className="mt-3 text-3xl font-bold">{title || 'Topic note'}</h1><p className="mt-3 text-slate-600">Keep examples, questions, and takeaways together. Notes remain available when you adjust or replace a roadmap.</p></header><ErrorMessage error={error} onRetry={() => setReload(reload + 1)} />{notice && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-indigo-900">{notice}</p>}{title && <form onSubmit={save} className="card space-y-4"><label className="label" htmlFor="note-content">Your notes</label><textarea id="note-content" className="field min-h-72" rows={12} maxLength={6000} required value={content} disabled={saving} onChange={(event) => setContent(event.target.value)} placeholder="What did you learn? What do you want to revisit?" /><p className="text-xs text-slate-500">{content.length}/6000 characters · {content !== (note?.content || '') ? 'Unsaved changes' : note ? `Saved ${new Date(note.updatedAt).toLocaleString()}` : 'Not saved yet'}</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" disabled={saving || !content.trim()}>{saving ? 'Saving…' : 'Save note'}</button>{note && <button type="button" className="btn btn-secondary" disabled={saving} onClick={remove}>Delete note</button>}</div></form>}<Link to="/library" className="btn btn-secondary" onClick={(event) => { if (content !== (note?.content || '') && !window.confirm('Leave without saving your changes?')) event.preventDefault(); }}>Back to my library</Link></section>;
}
