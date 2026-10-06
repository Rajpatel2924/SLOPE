import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Loader from './components/Loader.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Chat from './pages/Chat.jsx';
import Placement from './pages/Placement.jsx';
import NotFound from './pages/NotFound.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const pageTitles = {
  '/': 'Your learning, with direction',
  '/register': 'Create account',
  '/login': 'Log in',
  '/onboarding': 'Learning profile',
  '/dashboard': 'Dashboard',
  '/roadmap': 'Learning roadmap',
  '/chat': 'Study assistant',
  '/placement': 'Placement preparation',
};

export default function App() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    document.title = `${pageTitles[pathname] || 'Page not found'} | SLOPE 2.0`;
    const changedPage = previousPath.current !== pathname;
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
      else window.scrollTo(0, 0);
      if (changedPage) document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Suspense fallback={<Loader message="Loading your dashboard..." />}><Dashboard /></Suspense>} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/placement" element={<Placement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="mt-12 border-t border-slate-200 bg-white py-6">
        <div className="page-shell flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-700">SLOPE 2.0</p>
          <p>Self Learning &amp; Optimized Personal Learning Environment</p>
        </div>
      </footer>
    </div>
  );
}
