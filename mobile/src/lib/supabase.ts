// ==============================================================================
// Daily Love For Jesus - Mobile Supabase Auth Client
// ==============================================================================

export interface MobileAuthResponse {
  data: {
    user: any | null;
    session: any | null;
  };
  error: { message: string } | null;
}

// Read credentials from environment (.env)
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

let currentToken: string | null = null;

export function getMobileAuthToken(): string | null {
  return currentToken;
}

export function setMobileAuthToken(token: string | null) {
  currentToken = token;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) window.localStorage.setItem("@daily_love_mobile_token", token);
      else window.localStorage.removeItem("@daily_love_mobile_token");
    }
  } catch {}
}

export const mobileSupabase = {
  signIn: async (email: string, password: string): Promise<MobileAuthResponse> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          data: { user: null, session: null },
          error: { message: data.error_description || data.msg || "Login failed" },
        };
      }

      if (data.access_token) {
        setMobileAuthToken(data.access_token);
      }

      return {
        data: { user: data.user, session: data },
        error: null,
      };
    } catch (err: any) {
      return {
        data: { user: null, session: null },
        error: { message: err.message || "Network error" },
      };
    }
  },

  signUp: async (email: string, password: string, name?: string): Promise<MobileAuthResponse> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          data: { name, full_name: name },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          data: { user: null, session: null },
          error: { message: data.msg || data.message || "Registration failed" },
        };
      }

      if (data.access_token) {
        setMobileAuthToken(data.access_token);
      }

      return {
        data: { user: data.user, session: data },
        error: null,
      };
    } catch (err: any) {
      return {
        data: { user: null, session: null },
        error: { message: err.message || "Network error" },
      };
    }
  },
};
