import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api.js';
import Loader from '../components/Loader.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Quizzes() {
  const [params] = useSearchParams();
  const [roadmap, setRoadmap] = useState(null);
  const [selection, setSelection] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null); setMissing(false);
    Promise.all([api.get('/roadmap', { signal: controller.signal }), api.get('/quizzes/attempts', { signal: controller.signal })])
      .then(([path, results]) => {
        if (controller.signal.aborted) return;
        setRoadmap(path.data.roadmap); setAttempts(results.data.attempts);
        const key = `${params.get('module')}:${params.get('topic')}`;
        const exists = path.data.roadmap.modules[Number(params.get('module'))]?.topics[Number(params.get('topic'))];
        setSelection(params.has('module') && params.has('topic') && exists ? key : '0:0');
      })
      .catch((requestError) => { if (!controller.signal.aborted) { if (requestError.response?.status === 404) setMissing(true); else setError(requestError); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [params, reload]);

  async function start() {
    if (busy) return;
    setBusy(true); setError(null); setAttempt(null);
    const [moduleIdx, topicIdx] = selection.split(':').map(Number);
    try { const { data } = await api.post('/quizzes/start', { roadmapId: roadmap.id, moduleIdx, topicIdx }); setQuiz(data.quiz); setAnswers(Array(data.quiz.questions.length).fill(-1)); }
    catch (requestError) { setError(requestError); }
    finally { setBusy(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/submit`, { answers });
      setAttempt(data.attempt);
      setAttempts((current) => [data.attempt, ...current.filter((entry) => entry.id !== data.attempt.id)]);
    } catch (requestError) { setError(requestError); }
    finally { setBusy(false); }
  }

  if (loading) return <Loader message="Loading quizzes and results…" />;
  if (missing) return <section className="page-shell py-10"><div className="card"><h1 className="text-2xl font-bold">Choose a learning path first</h1><Link to="/onboarding" className="btn btn-primary mt-5">Create roadmap</Link></div></section>;
  return <section className="page-shell space-y-6 py-10">
    <header><p className="eyebrow">Check your understanding</p><h1 className="mt-3 text-3xl font-bold">Topic quizzes</h1><p className="mt-3 text-slate-600">Five questions, clear explanations, and saved results. Scores guide revision; they do not change your completed checklist.</p></header>
    <ErrorMessage error={error} onRetry={() => setReload(reload + 1)} />
    {roadmap && <div className="card flex flex-wrap items-end gap-4"><div className="min-w-0 flex-1"><label htmlFor="quiz-topic" className="label">Choose a topic</label><select id="quiz-topic" className="field" disabled={busy} value={selection} onChange={(event) => setSelection(event.target.value)}>{roadmap.modules.flatMap((module, moduleIdx) => module.topics.map((topic, topicIdx) => <option key={`${moduleIdx}:${topicIdx}`} value={`${moduleIdx}:${topicIdx}`}>{module.title} / {topic.title}</option>))}</select></div><button className="btn btn-primary" onClick={start} disabled={busy}>{busy ? 'Working…' : 'Start new quiz'}</button></div>}
    {quiz && !attempt && <form className="card space-y-6" onSubmit={submit}>
      <h2 className="text-xl font-bold">{quiz.topicTitle}</h2><p className="text-sm text-slate-600">{quiz.source === 'curated' ? `Curated foundation practice: ${quiz.focus}.` : 'AI-generated practice. Cross-check explanations with your learning resources.'} Submit to reveal explanations.</p>
      {quiz.questions.map((question, index) => <fieldset key={index} disabled={busy} className="space-y-3 rounded-xl border border-slate-200 p-4"><legend className="px-2 font-semibold">{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIdx) => <label key={optionIdx} className="flex min-h-11 items-start gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="radio" className="mt-1 accent-indigo-700" name={`question-${index}`} value={optionIdx} required checked={answers[index] === optionIdx} onChange={() => setAnswers((current) => current.map((value, questionIdx) => questionIdx === index ? optionIdx : value))} /><span className="text-sm">{option}</span></label>)}</fieldset>)}
      <button className="btn btn-primary" disabled={busy || answers.includes(-1)}>{busy ? 'Saving result…' : 'Submit and save result'}</button>
    </form>}
    {attempt && <section className="card space-y-5" aria-labelledby="quiz-result-title"><h2 id="quiz-result-title" className="text-2xl font-bold">{attempt.score}% · {attempt.correct} of {attempt.total} correct</h2><p className="text-sm text-slate-600">{attempt.topicTitle} · {new Date(attempt.createdAt).toLocaleString()}</p>{attempt.review.map((question, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">{index + 1}. {question.prompt}</h3><p className={`mt-2 text-sm font-semibold ${question.selectedIndex === question.correctIndex ? 'text-green-700' : 'text-amber-800'}`}>{question.selectedIndex === question.correctIndex ? 'Correct' : 'Needs review'} · Your answer: {question.options[question.selectedIndex]}</p><p className="mt-2 text-sm">Correct answer: {question.options[question.correctIndex]}</p><p className="mt-2 text-sm text-slate-600">{question.explanation}</p></div>)}</section>}
    <section className="card"><h2 className="text-xl font-bold">Saved results</h2>{!attempts.length ? <p className="mt-3 text-sm text-slate-600">Your submitted quizzes will appear here.</p> : <ul className="mt-4 divide-y divide-slate-200">{attempts.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{entry.topicTitle}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()} · {entry.score}%{entry.roadmapId !== roadmap?.id ? ' · Earlier roadmap' : ''}</p></div><button className="btn btn-secondary" disabled={busy} onClick={() => { setQuiz(null); setAttempt(entry); }}>Review answers</button></li>)}</ul>}</section>
  </section>;
}
