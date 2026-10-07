/**
 * Web Local Storage Cache & Offline Queue for Community Chat
 * Persists all chat messages locally and syncs with server when online.
 */

const STORAGE_PREFIX = 'daily_love_chat_cache_';
const OFFLINE_QUEUE_KEY = 'daily_love_chat_outgoing_queue';

export interface LocalChatMessage {
  id: number;
  channelType: string;
  communityId?: string | null;
  groupId?: number | null;
  senderId: string;
  receiverId?: string | null;
  content: string;
  mediaUrl?: string | null;
  isEncrypted?: boolean;
  isPinned: boolean;
  isKept?: boolean;
  isAnnouncement: boolean;
  expiresAt?: string | null;
  createdAt: string;
  senderName: string | null;
  senderAvatar: string | null;
  senderRole: string | null;
  decryptedContent?: string;
}

export interface QueuedOfflineMessage {
  tempId: string;
  channelType: string;
  communityId?: string;
  groupId?: number;
  receiverId?: string;
  content: string;
  mediaUrl?: string;
  isAnnouncement?: boolean;
  isEncrypted?: boolean;
  queuedAt: string;
}

/**
 * Loads messages for a specific channel from browser local storage
 */
export function getLocalChatMessages(channelKey: string): LocalChatMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${channelKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[chatStorage] Failed to read cached messages:', err);
  }
  return [];
}

/**
 * Saves and merges messages into local storage
 */
export function saveLocalChatMessages(
  channelKey: string,
  incomingMessages: LocalChatMessage[],
): void {
  try {
    const existing = getLocalChatMessages(channelKey);
    const messageMap = new Map<number, LocalChatMessage>();

    for (const m of existing) {
      messageMap.set(m.id, m);
    }
    for (const m of incomingMessages) {
      messageMap.set(m.id, m);
    }

    const merged = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    localStorage.setItem(`${STORAGE_PREFIX}${channelKey}`, JSON.stringify(merged));
  } catch (err) {
    console.warn('[chatStorage] Failed to persist messages:', err);
  }
}

/**
 * Queues an outgoing message if user is offline or fetch fails
 */
export function queueOfflineMessage(msg: Omit<QueuedOfflineMessage, 'tempId' | 'queuedAt'>): QueuedOfflineMessage {
  const queuedItem: QueuedOfflineMessage = {
    ...msg,
    tempId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
  };

  try {
    const currentQueue: QueuedOfflineMessage[] = JSON.parse(
      localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]',
    );
    currentQueue.push(queuedItem);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));
  } catch (err) {
    console.warn('[chatStorage] Failed to queue offline message:', err);
  }

  return queuedItem;
}

/**
 * Retrieves the list of pending offline messages
 */
export function getOfflineMessageQueue(): QueuedOfflineMessage[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * Synchronizes pending offline messages with server when internet is restored
 */
export async function syncOfflineMessages(
  senderFn: (payload: any) => Promise<any>,
): Promise<{ syncedCount: number; errors: number }> {
  const queue = getOfflineMessageQueue();
  if (queue.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;
  const remainingQueue: QueuedOfflineMessage[] = [];

  for (const item of queue) {
    try {
      await senderFn({
        channelType: item.channelType,
        communityId: item.communityId,
        groupId: item.groupId,
        receiverId: item.receiverId,
        content: item.content,
        mediaUrl: item.mediaUrl,
        isAnnouncement: item.isAnnouncement,
        isEncrypted: item.isEncrypted,
      });
      syncedCount++;
    } catch {
      errors++;
      remainingQueue.push(item);
    }
  }

  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch {}

  return { syncedCount, errors };
}
