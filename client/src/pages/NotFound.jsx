import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <section className="page-shell max-w-2xl py-20 text-center">
      <p className="eyebrow">404 · Page not found</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Let’s get you back on track</h1>
      <p className="mt-4 leading-relaxed text-slate-600">This address does not lead to a SLOPE page. Check the URL or choose a destination below.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to={user ? '/dashboard' : '/login'} className="btn btn-secondary">{user ? 'Open my dashboard' : 'Log in to SLOPE'}</Link>
      </div>
    </section>
  );
}
