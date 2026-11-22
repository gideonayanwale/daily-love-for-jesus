import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/types/trpc-router";
export type { AppRouter };
import type { ReactNode } from "react";
import { getSupabaseAccessToken } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient();
const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiBase}/api/trpc`,
      transformer: superjson,
      headers() {
        const token = getSupabaseAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (typeof window !== "undefined") {
          headers["x-client-path"] = window.location.pathname;
        }
        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
