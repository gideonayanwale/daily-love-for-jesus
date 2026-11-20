import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type AuthError } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export interface MobileAuthResponse {
  data: {
    user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];
  };
  error: AuthError | null;
}

export async function getMobileAuthToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export const mobileSupabase = {
  signIn: async (email: string, password: string): Promise<MobileAuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data: { user: data.user, session: data.session }, error };
  },

  signUp: async (email: string, password: string, name?: string): Promise<MobileAuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, full_name: name } },
    });
    return { data: { user: data.user, session: data.session }, error };
  },

  signOut: async () => supabase.auth.signOut(),
};
