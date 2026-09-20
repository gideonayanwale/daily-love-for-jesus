import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { supabaseAdmin } from "./lib/supabase";
import { findUserById, upsertUser } from "./queries/users";
import * as cookie from "cookie";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function authenticateSupabaseRequest(headers: Headers): Promise<User | undefined> {
  // 1. Try Authorization header: Bearer <token>
  const authHeader = headers.get("authorization");
  let token: string | undefined;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. Fallback to cookie
  if (!token) {
    const cookies = cookie.parse(headers.get("cookie") || "");
    token = cookies["sb-access-token"] || cookies["daily_love_token"];
  }

  if (!token) {
    return undefined;
  }

  try {
    const authUser = await supabaseAdmin.getUser(token);
    if (!authUser || !authUser.id) {
      return undefined;
    }

    // Lookup profile in public.users
    let dbUser = await findUserById(authUser.id);

    if (!dbUser) {
      // Auto-provision profile from Supabase Auth metadata
      dbUser = await upsertUser({
        id: authUser.id,
        email: authUser.email ?? null,
        name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
        avatar: authUser.user_metadata?.avatar_url ?? null,
        role: "user",
      });
    }

    return dbUser;
  } catch (err) {
    console.error("[auth] Supabase request authentication error:", err);
    return undefined;
  }
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateSupabaseRequest(opts.req.headers);
  } catch {
    // Authentication is optional on context creation
  }
  return ctx;
}
