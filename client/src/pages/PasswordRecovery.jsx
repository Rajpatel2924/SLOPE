import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function PasswordRecovery({ reset = false }) {
  const { hash } = useLocation();
  const [token] = useState(() => new URLSearchParams(hash.slice(1)).get('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (reset && password !== confirmation) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { data } = await api.post(reset ? '/auth/reset-password' : '/auth/forgot-password', reset ? { token, password } : { email });
      setResult(data);
    } catch (requestError) { setError(requestError); }
    finally { setSaving(false); }
  }

  return (
    <section className="page-shell py-12"><div className="card mx-auto max-w-lg">
      <p className="eyebrow">Account recovery</p>
      <h1 className="mt-3 text-2xl font-bold">{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
      <p className="mt-3 text-sm text-slate-600">{reset ? 'Reset links expire after 30 minutes and can only be used once.' : 'Enter your account email to receive a password reset link.'}</p>
      <ErrorMessage error={error} />
      {result ? <div role="status" className="mt-6 space-y-4">
        <p className="rounded-xl bg-indigo-50 p-4 text-indigo-900">{result.message}</p>
        {result.previewUrl && <p className="text-sm">Development email preview: <a href={result.previewUrl} className="font-semibold text-indigo-700 underline">Open reset link</a></p>}
        {reset && <Link to="/login" className="btn btn-primary">Log in</Link>}
        {!reset && <button className="btn btn-secondary" onClick={() => setResult(null)}>Try another email</button>}
      </div> : reset && !token ? <p className="mt-6 text-sm text-red-700">This link has no reset token. Request a new link below.</p> : <form onSubmit={submit} className="mt-6 space-y-5" aria-busy={saving}>
        {reset ? <>
          <div><label className="label" htmlFor="new-password">New password</label><input id="new-password" className="field" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={saving} /></div>
          <div><label className="label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" className="field" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={saving} /></div>
        </> : <div><label className="label" htmlFor="recovery-email">Email address</label><input id="recovery-email" className="field" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} /></div>}
        <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Submitting…' : reset ? 'Reset password' : 'Send reset link'}</button>
      </form>}
      <div className="mt-6 flex flex-wrap gap-4 text-sm text-indigo-700"><Link to="/login" className="underline">Back to login</Link>{reset && <Link to="/forgot-password" className="underline">Request a new link</Link>}</div>
    </div></section>
  );
}
