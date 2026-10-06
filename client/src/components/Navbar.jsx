import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuButton = useRef(null);

  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

  function signOut() {
    logout();
    setOpen(false);
    navigate('/login', { replace: true });
  }

  const navClass = ({ isActive }) => `rounded-lg px-3 py-3 text-sm font-semibold ${isActive ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <header className="border-b border-slate-200 bg-white" onKeyDown={(event) => { if (event.key === 'Escape' && open) { setOpen(false); menuButton.current?.focus(); } }}>
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-4">
        <Link to="/" className="flex min-h-11 items-center gap-3" aria-label="SLOPE 2.0 home">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-xl font-black text-white">S</span>
          <span className="text-lg font-extrabold tracking-tight">SLOPE <span className="text-indigo-700">2.0</span></span>
        </Link>
        <button ref={menuButton} type="button" className="btn btn-secondary lg:hidden" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>
          {open ? 'Close menu' : 'Menu'}
        </button>
        <nav id="site-navigation" aria-label="Main navigation" className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-2 lg:flex lg:w-auto lg:min-w-0 lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end`}>
          <NavLink to="/" end className={navClass}>Home</NavLink>
          <Link to="/#resources" className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">Resources</Link>
          {!loading && (user ? (
            <>
              <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
              <NavLink to="/study-plan" className={navClass}>Today</NavLink>
              <NavLink to="/roadmap" className={navClass}>Roadmap</NavLink>
              <NavLink to="/quizzes" className={navClass}>Quizzes</NavLink>
              <NavLink to="/library" className={navClass}>My library</NavLink>
              <NavLink to="/chat" className={navClass}>Study assistant</NavLink>
              <NavLink to="/placement" className={navClass}>Placement</NavLink>
              <NavLink to="/account" className={navClass}>Account</NavLink>
              <button type="button" onClick={signOut} className="btn btn-secondary">Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Log in</NavLink>
              <Link to="/register" className="btn btn-primary">Get started</Link>
            </>
          ))}
        </nav>
      </div>
    </header>
  );
}
