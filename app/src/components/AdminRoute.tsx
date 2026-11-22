import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading, error, refresh, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || error) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'elevated_admin' && user.role !== 'superadmin') {
      navigate('/');
    }
  }, [isLoading, error, user, navigate]);

  if (error && user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center" role="alert">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Administrator access could not be verified</h2>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">The application could not load your authoritative account role. No administrator privileges have been granted. Retry the profile check or sign out.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void refresh()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950">Retry</button>
          <button type="button" onClick={() => void logout()} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">Sign out</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-amber-700 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'elevated_admin' && user.role !== 'superadmin')) {
    return null;
  }

  return <>{children}</>;
}
