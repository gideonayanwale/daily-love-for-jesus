import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { supabase, type SupabaseSession } from "@/lib/supabase";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Subscribe to Supabase Auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setIsAuthChecking(false);
        // Invalidate tRPC cache so backend profile refreshes with new token
        utils.auth.me.invalidate();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [utils]);

  // Query server database profile
  const {
    data: dbUser,
    isLoading: isDbLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    await utils.invalidate();
    navigate(redirectPath);
  }, [navigate, redirectPath, utils]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (!res.error && res.data.session) {
        await utils.auth.me.invalidate();
      }
      return res;
    },
    [utils]
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, full_name: name },
        },
      });
      if (!res.error && res.data.session) {
        await utils.auth.me.invalidate();
      }
      return res;
    },
    [utils]
  );

  const isLoading = isAuthChecking || (!!session && isDbLoading);
  const isAuthenticated = !!session;

  // Fallback user object from session if DB hasn't loaded yet
  const user = useMemo(() => {
    if (dbUser) return dbUser;
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null,
        avatar: session.user.user_metadata?.avatar_url ?? null,
        role: session.user.role ?? "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignInAt: new Date(),
      };
    }
    return null;
  }, [dbUser, session]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, isAuthenticated, navigate, redirectPath]);

  return useMemo(
    () => ({
      user,
      session,
      isAuthenticated,
      isLoading,
      error,
      signIn,
      signUp,
      logout,
      refresh: refetch,
    }),
    [user, session, isAuthenticated, isLoading, error, signIn, signUp, logout, refetch],
  );
}
