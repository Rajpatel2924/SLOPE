import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import Loader from './Loader.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading, sessionError, refreshSession } = useAuth();
  if (loading) return <Loader message="Checking your session..." />;
  if (sessionError) {
    return (
      <section className="page-shell py-12">
        <h1 className="mb-4 text-2xl font-bold">We could not verify your session</h1>
        <ErrorMessage error={sessionError} onRetry={() => refreshSession()} />
      </section>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children || <Outlet />;
}
