import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPostAuthPath } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(form);
      navigate(await getPostAuthPath(), { replace: true });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader message="Checking your session..." />;

  return (
    <section className="page-shell grid gap-8 py-12 lg:grid-cols-2 lg:py-20">
      <div className="rounded-2xl bg-indigo-700 p-8 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Welcome back</p>
        <h1 className="mt-5 text-3xl leading-tight font-bold sm:text-4xl">Make time for your next small win.</h1>
        <p className="mt-5 max-w-md leading-relaxed text-indigo-100">A clear learning path helps you spend more time practicing and less time deciding where to begin.</p>
        <ul className="mt-8 space-y-4 text-sm text-indigo-100">
          <li>✓ Learning topics in a useful order</li>
          <li>✓ Curated resources for each step</li>
          <li>✓ Progress you can see and build on</li>
        </ul>
      </div>
      <div className="card mx-auto w-full max-w-lg self-center p-7 sm:p-9">
        <h2 className="text-2xl font-bold">Log in to SLOPE</h2>
        <p className="mt-2 text-sm text-slate-500">Use the email and password you registered with.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={submitting}>
          <ErrorMessage error={error} />
          <div>
            <label htmlFor="login-email" className="label">Email address</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required maxLength={254} className="field" value={form.email} disabled={submitting} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div>
            <label htmlFor="login-password" className="label">Password</label>
            <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} className="field" value={form.password} disabled={submitting} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-indigo-700" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide password' : 'Show password'}</button>
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">{submitting ? 'Signing you in...' : 'Log in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">New to SLOPE? <Link to="/register" className="font-semibold text-indigo-700 underline underline-offset-4">Create an account</Link></p>
      </div>
    </section>
  );
}
