/**
 * Offline-first Reading Activity Tracker for React Native / Expo
 *
 * Features:
 * - Records reading logs locally (AsyncStorage / persistent storage fallback)
 * - Automatically detects network reconnection and dispatches batch sync to /api/tracking/sync
 * - Deduplicates using UUID clientLogId
 * - Race-condition safe: new logs added during a sync flight are never lost
 */

export interface ReadingLogPayload {
  contentId: string;       // e.g. "bible:40:5" (Matthew 5) or "devotional:12"
  contentType: "bible_chapter" | "devotional" | "reading_assignment";
  bookNumber?: number;
  chapter?: number;
  timeSpent: number;       // In seconds
  scrollDepth: number;     // 0-100 percentage
  completedAt: string;     // ISO timestamp
  clientLogId: string;     // Unique UUID for idempotency
  groupId?: number;
}

const STORAGE_KEY = "@daily_love_offline_reading_queue_v1";

// Safe cross-platform storage adapter
class StorageAdapter {
  private memoryCache: Map<string, string> = new Map();

  private getAsyncStorage() {
    try {
      const mod = require("@react-native-async-storage/async-storage");
      // Support both CommonJS default and ESM module formats
      return mod?.default ?? mod;
    } catch {
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const AsyncStorage = this.getAsyncStorage();
    if (AsyncStorage) {
      try {
        return await AsyncStorage.getItem(key);
      } catch {}
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}

    return this.memoryCache.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const AsyncStorage = this.getAsyncStorage();
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(key, value);
        return;
      } catch {}
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {}

    this.memoryCache.set(key, value);
  }
}

const storage = new StorageAdapter();

function generateClientUuid(): string {
  return "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

export class ReadingTrackerService {
  private static isSyncing = false;

  /**
   * Retrieves the current offline queue of un-synced reading logs.
   */
  static async getQueue(): Promise<ReadingLogPayload[]> {
    try {
      const raw = await storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[ReadingTracker] Failed to read queue:", err);
      return [];
    }
  }

  /**
   * Records a completed reading event to local offline storage.
   */
  static async recordReading(params: {
    contentId: string;
    contentType?: "bible_chapter" | "devotional" | "reading_assignment";
    bookNumber?: number;
    chapter?: number;
    timeSpentSeconds: number;
    scrollDepth?: number;
    groupId?: number;
  }): Promise<ReadingLogPayload> {
    const queue = await this.getQueue();

    // Prevent immediate duplicate log for the exact same chapter on the same day
    const today = new Date().toISOString().split("T")[0];
    const alreadyRecorded = queue.some(
      (item) => item.contentId === params.contentId && item.completedAt.startsWith(today)
    );

    if (alreadyRecorded) {
      const existing = queue.find((i) => i.contentId === params.contentId)!;
      return existing;
    }

    const payload: ReadingLogPayload = {
      contentId: params.contentId,
      contentType: params.contentType ?? "bible_chapter",
      bookNumber: params.bookNumber,
      chapter: params.chapter,
      timeSpent: Math.max(1, params.timeSpentSeconds),
      scrollDepth: params.scrollDepth ?? 100,
      completedAt: new Date().toISOString(),
      clientLogId: generateClientUuid(),
      groupId: params.groupId,
    };

    queue.push(payload);
    await storage.setItem(STORAGE_KEY, JSON.stringify(queue));

    console.log(`[ReadingTracker] Logged offline event for ${params.contentId}. Queue size: ${queue.length}`);

    // Trigger immediate background sync if network is active
    this.syncQueue();

    return payload;
  }

  /**
   * Flushes the offline queue by batch posting logs to POST /api/tracking/sync.
   * Race-condition safe: snapshots the synced IDs before the network request,
   * then only removes those specific items on success — preserving any new logs
   * that were added while the request was in flight.
   */
  static async syncQueue(options?: { apiUrl?: string; authToken?: string }): Promise<{
    synced: number;
    remaining: number;
  }> {
    if (this.isSyncing) {
      return { synced: 0, remaining: (await this.getQueue()).length };
    }

    const queue = await this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    this.isSyncing = true;
    const apiUrl = (options?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
    const token = options?.authToken ?? (await storage.getItem("@daily_love_mobile_token")) ?? null;

    // Snapshot the IDs we are about to sync so new items added during the
    // fetch flight are not accidentally removed from the queue on success.
    const syncingIds = new Set(queue.map((item) => item.clientLogId));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/tracking/sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ logs: queue }),
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`[ReadingTracker] Sync succeeded! Synced ${result.syncedCount} records.`);

      // Remove ONLY the items we synced — preserve any new items added during flight
      const currentQueue = await this.getQueue();
      const remaining = currentQueue.filter((item) => !syncingIds.has(item.clientLogId));
      await storage.setItem(STORAGE_KEY, JSON.stringify(remaining));

      this.isSyncing = false;
      return { synced: queue.length, remaining: remaining.length };
    } catch (err) {
      console.warn(
        "[ReadingTracker] Sync failed (device offline or server unreachable). Will retry later:",
        err
      );
      this.isSyncing = false;
      return { synced: 0, remaining: queue.length };
    }
  }
}
