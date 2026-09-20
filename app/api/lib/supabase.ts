// ==============================================================================
// Daily Love For Jesus - Server-side Supabase Client (Hono / Backend)
// ==============================================================================

import { env } from "./env";

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  role?: string;
}

export class ServerSupabaseClient {
  private url: string;
  private key: string;

  constructor() {
    this.url = (env.supabaseUrl || "").replace(/\/$/, "");
    this.key = env.supabaseServiceRoleKey || env.supabaseAnonKey || "";
  }

  /**
   * Verifies an access token with Supabase Auth GoTrue API
   * Returns the authenticated user object or null
   */
  async getUser(token: string): Promise<SupabaseAuthUser | null> {
    if (!token || !this.url || !this.key) {
      return null;
    }

    try {
      const res = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.key,
        },
      });

      if (!res.ok) {
        return null;
      }

      const user = (await res.json()) as SupabaseAuthUser;
      return user;
    } catch (err) {
      console.error("[supabase-server] Token verification error:", err);
      return null;
    }
  }
}

export const supabaseAdmin = new ServerSupabaseClient();
