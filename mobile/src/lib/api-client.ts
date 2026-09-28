// ==============================================================================
// Daily Love For Jesus - Mobile API Client
// Connected to NestJS Backend (REST & OpenAPI Endpoints)
// ==============================================================================

import { Platform } from 'react-native';

// Auto-resolve API base URL based on platform & environment
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Android emulator maps 10.0.2.2 to host machine's localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  // iOS simulator, web, or desktop default
  return 'http://localhost:4000';
}

const BASE_URL = getApiBaseUrl();

// ── Generic Fetch Helper ─────────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error || errorDetail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// ── Devotionals API ──────────────────────────────────────────────────────────
export interface MobileDevotional {
  id: number;
  title: string;
  scripture?: string | null;
  scriptureText?: string | null;
  body: string;
  reflection?: string | null;
  prayer?: string | null;
  author?: string | null;
  source: 'telegram' | 'manual' | 'api';
  devotionalDate: string;
  createdAt: string;
}

export const mobileDevotionalsApi = {
  getToday: async (): Promise<MobileDevotional | null> => {
    try {
      return await request<MobileDevotional>('/api/devotionals/today');
    } catch (err) {
      console.warn('[mobile-api] Failed to fetch today devotional:', err);
      return null;
    }
  },

  getList: async (limit = 20, offset = 0): Promise<{ items: MobileDevotional[]; total: number }> => {
    return request<{ items: MobileDevotional[]; total: number }>(
      `/api/devotionals?limit=${limit}&offset=${offset}`
    );
  },

  getById: async (id: number): Promise<MobileDevotional> => {
    return request<MobileDevotional>(`/api/devotionals/${id}`);
  },
};

// ── Hymns API ────────────────────────────────────────────────────────────────
export interface MobileHymn {
  id: number;
  hymnNumber: number;
  title: string;
  category?: string | null;
  author?: string | null;
  lyrics: string;
  chorus?: string | null;
  sheetMusicUrl?: string | null;
  audioUrl?: string | null;
}

export const mobileHymnsApi = {
  getList: async (search?: string, category?: string): Promise<MobileHymn[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<MobileHymn[]>(`/api/hymns${qs}`);
  },

  getRandom: async (): Promise<MobileHymn | null> => {
    try {
      return await request<MobileHymn>('/api/hymns/random');
    } catch {
      return null;
    }
  },

  getCategories: async (): Promise<string[]> => {
    return request<string[]>('/api/hymns/categories');
  },

  getById: async (id: number): Promise<MobileHymn> => {
    return request<MobileHymn>(`/api/hymns/${id}`);
  },

  getByNumber: async (hymnNumber: number): Promise<MobileHymn> => {
    return request<MobileHymn>(`/api/hymns/number/${hymnNumber}`);
  },
};

// ── Bible Scripture API ──────────────────────────────────────────────────────
export interface MobileVerseOfTheDay {
  id: number;
  bookNumber: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export const mobileBibleApi = {
  getRandomVerse: async (translation = 'KJV'): Promise<MobileVerseOfTheDay | null> => {
    try {
      return await request<MobileVerseOfTheDay>(`/api/bible/random?translation=${translation}`);
    } catch {
      return null;
    }
  },

  getTranslations: async () => {
    return request<Array<{ shortName: string; fullName: string; language: string }>>(
      '/api/bible/translations/popular'
    );
  },

  getBooks: async () => {
    return request<Array<{ id: number; name: string; shortName: string; testament: string; chapters: number }>>(
      '/api/bible/books'
    );
  },

  getVerses: async (bookNumber: number, chapter: number, translation = 'KJV') => {
    return request<Array<{ id: number; bookNumber: number; chapter: number; verse: number; text: string; translation: string }>>(
      `/api/bible/verses?bookNumber=${bookNumber}&chapter=${chapter}&translation=${translation}`
    );
  },
};

// ── Backend Health & Connection Diagnostic ───────────────────────────────────
export async function checkBackendConnection(): Promise<{
  connected: boolean;
  url: string;
  statusText: string;
  details?: any;
}> {
  try {
    const res = await request<any>('/api/sync/health');
    return {
      connected: true,
      url: BASE_URL,
      statusText: 'Connected (NestJS Backend)',
      details: res,
    };
  } catch (err: any) {
    return {
      connected: false,
      url: BASE_URL,
      statusText: err.message || 'Connection failed',
    };
  }
}
