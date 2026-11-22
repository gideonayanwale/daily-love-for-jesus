import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error, refresh, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center" role="alert">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">We couldn't verify your account profile</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your session is present, but the application could not load your account record. Please retry before continuing.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void refresh()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950">Retry</button>
          <button type="button" onClick={() => void logout()} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">Sign out</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
