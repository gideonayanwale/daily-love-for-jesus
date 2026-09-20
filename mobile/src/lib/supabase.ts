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

// Configurable endpoint - replace with your Supabase URL
const SUPABASE_URL = "https://your-project-ref.supabase.co";
const SUPABASE_ANON_KEY = "your_supabase_anon_key_here";

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
