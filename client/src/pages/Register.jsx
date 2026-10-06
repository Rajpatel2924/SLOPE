import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Loader from '../components/Loader.jsx';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match. Please check them and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...credentials } = form;
      await register(credentials);
      navigate('/onboarding', { replace: true });
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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Your learning, with direction</p>
        <h1 className="mt-5 text-3xl leading-tight font-bold sm:text-4xl">A focused start for your engineering goals.</h1>
        <p className="mt-5 max-w-md leading-relaxed text-indigo-100">Create your account and bring your learning resources, weekly goals, and progress into one place.</p>
        <div className="mt-8 rounded-xl border border-indigo-500 p-5 text-sm text-indigo-100">
          <p className="font-semibold text-white">Choose your direction</p>
          <p className="mt-2">Web development, DSA and placements, or AI and machine learning.</p>
        </div>
      </div>
      <div className="card mx-auto w-full max-w-lg p-7 sm:p-9">
        <h2 className="text-2xl font-bold">Create your account</h2>
        <p className="mt-2 text-sm text-slate-500">Start with a few details. Your learning profile comes next.</p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={submitting}>
          <ErrorMessage error={error} />
          <div>
            <label htmlFor="register-name" className="label">Full name</label>
            <input id="register-name" name="name" autoComplete="name" required minLength={2} maxLength={50} className="field" value={form.name} disabled={submitting} onChange={updateField} />
          </div>
          <div>
            <label htmlFor="register-email" className="label">Email address</label>
            <input id="register-email" name="email" type="email" autoComplete="username" required maxLength={254} className="field" value={form.email} disabled={submitting} onChange={updateField} />
          </div>
          <div>
            <label htmlFor="register-password" className="label">Password</label>
            <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-help" className="field" value={form.password} disabled={submitting} onChange={updateField} />
            <p id="password-help" className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="register-confirm" className="label">Confirm password</label>
            <input id="register-confirm" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} className="field" value={form.confirmPassword} disabled={submitting} onChange={updateField} />
            <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-indigo-700" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide passwords' : 'Show passwords'}</button>
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">{submitting ? 'Creating your account...' : 'Create account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" className="font-semibold text-indigo-700 underline underline-offset-4">Log in</Link></p>
      </div>
    </section>
  );
}
