import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error, refresh, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || error) return;
    if (!user) navigate("/login", { replace: true });
    else if (user.role !== "superadmin") navigate("/dashboard", { replace: true });
  }, [error, isLoading, navigate, user]);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">Verifying superadmin access…</div>;
  if (error) return <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 p-6 text-center" role="alert"><h2 className="font-bold">Superadmin access could not be verified</h2><p className="text-sm text-zinc-500">No elevated access is granted until the server profile can be verified.</p><div className="flex gap-2"><button onClick={() => void refresh()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950">Retry</button><button onClick={() => void logout()} className="rounded-lg border px-4 py-2 text-sm">Sign out</button></div></div>;
  if (!user || user.role !== "superadmin") return null;
  return <>{children}</>;
}
