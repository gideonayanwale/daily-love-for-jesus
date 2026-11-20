// ==============================================================================
// Daily Love For Jesus - Supabase Client (Web)
// ==============================================================================

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Network error";

// ── Realtime channel (lightweight broadcast subscriber using WebSocket) ────────
type BroadcastHandler = (payload: unknown) => void;

class RealtimeChannel {
  public readonly name: string;
  private url: string;
  private anonKey: string;
  private getSession: () => SupabaseSession | null;
  private handlers: Map<string, BroadcastHandler[]> = new Map();
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(name: string, url: string, anonKey: string, getSession: () => SupabaseSession | null) {
    this.name = name;
    this.url = url;
    this.anonKey = anonKey;
    this.getSession = getSession;
  }

  public on(
    type: 'broadcast',
    filter: { event: string },
    handler: BroadcastHandler,
  ): this {
    const key = `${type}:${filter.event}`;
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key)!.push(handler);
    return this;
  }

  public subscribe(): this {
    if (!this.url || !this.anonKey) return this;
    try {
      const wsUrl = this.url
        .replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))
        .replace(/\/$/, '');
      const session = this.getSession();
      const token = session?.access_token || this.anonKey;
      const ws = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${this.anonKey}&vsn=1.0.0`);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ topic: `realtime:${this.name}`, event: 'phx_join', payload: { access_token: token, config: { broadcast: { self: true }, private: true } }, ref: '1' }));
        this.heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null }));
          }
        }, 30_000);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string) as { event?: string; payload?: { event?: string; payload?: unknown } };
          if (msg.event === 'broadcast') {
            const broadcastEvent = msg.payload?.event ?? '';
            const key = `broadcast:${broadcastEvent}`;
            const fns = this.handlers.get(key);
            if (fns) fns.forEach((fn) => fn(msg.payload?.payload));
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {/* silent */};
    } catch {
      // realtime not available in test/dev without env
    }
    return this;
  }

  public unsubscribe(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ topic: `realtime:${this.name}`, event: 'phx_leave', payload: {}, ref: '2' }));
      this.ws.close();
    }
    this.ws = null;
  }
}

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  role?: string;
  created_at?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseUser;
}

export interface AuthResponse<T = SupabaseSession> {
  data: {
    user: SupabaseUser | null;
    session: T | null;
  };
  error: { message: string; status?: number } | null;
}

const STORAGE_KEY = "daily_love_supabase_session";

class SupabaseClient {
  private url: string;
  private anonKey: string;
  private listeners: Array<(event: string, session: SupabaseSession | null) => void> = [];

  constructor() {
    this.url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    this.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  }

  private getStoredSession(): SupabaseSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session: SupabaseSession = JSON.parse(raw);
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private setStoredSession(session: SupabaseSession | null) {
    try {
      if (session) {
        if (!session.expires_at && session.expires_in) {
          session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error("[supabase] Failed to save session to localStorage", e);
    }
  }

  private notifyListeners(event: string, session: SupabaseSession | null) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch (err) {
        console.error("[supabase] auth listener error", err);
      }
    });
  }

  public auth = {
    signUp: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }): Promise<AuthResponse> => {
      if (!this.url || !this.anonKey) {
        return {
          data: { user: null, session: null },
          error: { message: "Supabase URL and Anon Key are not configured in .env" },
        };
      }

      try {
        const res = await fetch(`${this.url}/auth/v1/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.anonKey,
          },
          body: JSON.stringify({
            email,
            password,
            data: options?.data,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { data: { user: null, session: null }, error: { message: data.msg || data.message || "Failed to sign up", status: res.status } };
        }

        const session = data.access_token ? (data as SupabaseSession) : null;
        if (session) {
          this.setStoredSession(session);
          this.notifyListeners("SIGNED_IN", session);
        }

        return {
          data: {
            user: data.user || session?.user || null,
            session,
          },
          error: null,
        };
      } catch (err: unknown) {
        return { data: { user: null, session: null }, error: { message: getErrorMessage(err) } };
      }
    },

    signInWithPassword: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<AuthResponse> => {
      if (!this.url || !this.anonKey) {
        return {
          data: { user: null, session: null },
          error: { message: "Supabase URL and Anon Key are not configured in .env" },
        };
      }

      try {
        const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.anonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          return {
            data: { user: null, session: null },
            error: { message: data.error_description || data.msg || data.message || "Invalid login credentials", status: res.status },
          };
        }

        const session = data as SupabaseSession;
        this.setStoredSession(session);
        this.notifyListeners("SIGNED_IN", session);

        return {
          data: {
            user: session.user,
            session,
          },
          error: null,
        };
      } catch (err: unknown) {
        return { data: { user: null, session: null }, error: { message: getErrorMessage(err) } };
      }
    },

    signOut: async (): Promise<{ error: { message: string } | null }> => {
      const session = this.getStoredSession();
      if (session && this.url && this.anonKey) {
        try {
          await fetch(`${this.url}/auth/v1/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: this.anonKey,
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        } catch {
          // ignore network error on logout
        }
      }

      this.setStoredSession(null);
      this.notifyListeners("SIGNED_OUT", null);
      return { error: null };
    },

    getSession: async (): Promise<{ data: { session: SupabaseSession | null }; error: null }> => {
      const session = this.getStoredSession();
      return { data: { session }, error: null };
    },

    getUser: async (): Promise<{ data: { user: SupabaseUser | null }; error: { message: string; status?: number } | null }> => {
      const session = this.getStoredSession();
      if (!session) {
        return { data: { user: null }, error: null };
      }
      return { data: { user: session.user }, error: null };
    },

    onAuthStateChange: (
      callback: (event: string, session: SupabaseSession | null) => void
    ) => {
      this.listeners.push(callback);
      // Immediately notify current state
      const current = this.getStoredSession();
      callback(current ? "INITIAL_SESSION" : "NO_SESSION", current);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter((l) => l !== callback);
            },
          },
        },
      };
    },

    resetPasswordForEmail: async (email: string) => {
      if (!this.url || !this.anonKey) {
        return { error: { message: "Supabase not configured" } };
      }
      try {
        const res = await fetch(`${this.url}/auth/v1/recover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.anonKey,
          },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json();
          return { error: { message: data.msg || "Password reset failed" } };
        }
        return { error: null };
      } catch (err: unknown) {
        return { error: { message: getErrorMessage(err) } };
      }
    },
  };

  // ── Realtime channel (lightweight broadcast listener) ──────────────────────
  private channels: Map<string, RealtimeChannel> = new Map();

  public channel(name: string): RealtimeChannel {
    if (this.channels.has(name)) return this.channels.get(name)!;
    const ch = new RealtimeChannel(name, this.url, this.anonKey, this.getStoredSession.bind(this));
    this.channels.set(name, ch);
    return ch;
  }

  public removeChannel(channel: RealtimeChannel): void {
    channel.unsubscribe();
    this.channels.delete(channel.name);
  }
}

export const supabase = new SupabaseClient();

export function getSupabaseAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: SupabaseSession = JSON.parse(raw);
    return session.access_token ?? null;
  } catch {
    return null;
  }
}
