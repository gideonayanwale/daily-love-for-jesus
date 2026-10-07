// ==============================================================================
// Daily Love For Jesus - Mobile API Client
// Connected to NestJS Backend (REST & OpenAPI Endpoints)
// ==============================================================================

import { Platform } from 'react-native';
import { getMobileAuthToken } from './supabase';

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
  
  const token = getMobileAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── Community & Sunday School API ────────────────────────────────────────────
export interface MobileGroup {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  inviteCode?: string | null;
  role: string;
}

export interface MobileAnnouncement {
  id: number;
  title: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export interface MobileStudent {
  userId: string;
  name: string;
  email: string;
  role: string;
  chaptersCompleted?: number;
  readingMinutes?: number;
  streakDays?: number;
}

export const mobileCommunityApi = {
  getMyGroups: async (): Promise<MobileGroup[]> => {
    try {
      return await request<MobileGroup[]>('/api/community/my-groups');
    } catch (err) {
      console.warn('[mobile-api] Failed to fetch groups:', err);
      return [];
    }
  },

  getGroupDetails: async (groupId: number) => {
    return request<any>(`/api/community/groups/${groupId}`);
  },

  joinGroup: async (inviteCode: string, whatsappNumber?: string) => {
    return request<any>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({
        inviteCode: inviteCode.trim(),
        whatsappNumber: whatsappNumber?.trim() || undefined,
      }),
    });
  },

  getRoster: async (groupId: number): Promise<{ students: MobileStudent[] }> => {
    return request<{ students: MobileStudent[] }>(`/api/dashboard/roster?groupId=${groupId}`);
  },

  createAttendanceSession: async (groupId: number, title?: string, sessionType = 'sunday_school') => {
    return request<any>('/api/attendance/session', {
      method: 'POST',
      body: JSON.stringify({ groupId, title, sessionType }),
    });
  },

  recordAttendance: async (
    sessionId: number,
    records: Array<{
      userId?: string;
      guestName?: string;
      guestPhone?: string;
      isGuest?: boolean;
      status: 'present' | 'absent' | 'excused' | 'late';
      notes?: string;
    }>
  ) => {
    return request<any>('/api/attendance/record', {
      method: 'POST',
      body: JSON.stringify({ sessionId, records }),
    });
  },

  createAnnouncement: async (
    groupId: number,
    title: string,
    body: string,
    priority: 'normal' | 'high' | 'urgent' = 'normal'
  ) => {
    return request<any>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({ groupId, title, body, priority }),
    });
  },

  getWeeklyReport: async (groupId: number) => {
    return request<any>(`/api/dashboard/reports/weekly?groupId=${groupId}`);
  },

  sendChatMessage: async (data: {
    channelType: 'general' | 'community' | 'group' | 'dm' | 'leadership';
    communityId?: string;
    groupId?: number;
    receiverId?: string;
    content: string;
    mediaUrl?: string;
    isAnnouncement?: boolean;
    isEncrypted?: boolean;
  }) => {
    return request<any>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listChatMessages: async (channelType: string, options: { groupId?: number; communityId?: string } = {}) => {
    let url = `/api/chat/messages?channelType=${channelType}`;
    if (options.groupId) url += `&groupId=${options.groupId}`;
    if (options.communityId) url += `&communityId=${options.communityId}`;
    return request<any[]>(url);
  },

  moderateChatMessage: async (messageId: number, action: 'pin' | 'unpin' | 'delete' | 'keep' | 'unkeep') => {
    return request<{ success: boolean; message: string; action: string }>(
      `/api/chat/messages/${messageId}/moderate`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      },
    );
  },

  createChatArchiveSnapshot: async (data: { communityId?: string; groupId?: number; channelType?: string }) => {
    return request<any>('/api/chat/archives/snapshot', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  listChatArchives: async (options: { communityId?: string; groupId?: number } = {}) => {
    let url = '/api/chat/archives';
    const params = new URLSearchParams();
    if (options.communityId) params.append('communityId', options.communityId);
    if (options.groupId) params.append('groupId', String(options.groupId));
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return request<any[]>(url);
  },

  downloadChatArchive: async (snapshotId: number) => {
    return request<{ snapshot: any; messages: any[]; totalMessages: number }>(
      `/api/chat/archives/${snapshotId}/download`,
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
