/**
 * React Native / Expo Local Storage Cache & Offline Queue for Community Chat
 * Uses @react-native-async-storage/async-storage for zero-latency offline loading
 * and automatic server synchronization when online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@daily_love_chat_cache_';
const OFFLINE_QUEUE_KEY = '@daily_love_chat_outgoing_queue';

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
 * Loads messages for a specific channel from mobile local storage
 */
export async function getMobileLocalChatMessages(channelKey: string): Promise<LocalChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${channelKey}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[mobileChatStorage] Failed to read cached messages:', err);
  }
  return [];
}

/**
 * Saves and merges messages into mobile local storage
 */
export async function saveMobileLocalChatMessages(
  channelKey: string,
  incomingMessages: LocalChatMessage[],
): Promise<void> {
  try {
    const existing = await getMobileLocalChatMessages(channelKey);
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

    await AsyncStorage.setItem(`${STORAGE_PREFIX}${channelKey}`, JSON.stringify(merged));
  } catch (err) {
    console.warn('[mobileChatStorage] Failed to persist messages:', err);
  }
}

/**
 * Queues an outgoing message if user is offline or send fails
 */
export async function queueMobileOfflineMessage(
  msg: Omit<QueuedOfflineMessage, 'tempId' | 'queuedAt'>,
): Promise<QueuedOfflineMessage> {
  const queuedItem: QueuedOfflineMessage = {
    ...msg,
    tempId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    queuedAt: new Date().toISOString(),
  };

  try {
    const currentQueue = await getMobileOfflineMessageQueue();
    currentQueue.push(queuedItem);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(currentQueue));
  } catch (err) {
    console.warn('[mobileChatStorage] Failed to queue offline message:', err);
  }

  return queuedItem;
}

/**
 * Retrieves the list of pending offline messages from mobile storage
 */
export async function getMobileOfflineMessageQueue(): Promise<QueuedOfflineMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[mobileChatStorage] Failed to get offline queue:', err);
  }
  return [];
}

/**
 * Synchronizes pending offline messages with server when internet is available
 */
export async function syncMobileOfflineMessages(
  senderFn: (payload: any) => Promise<any>,
): Promise<{ syncedCount: number; errors: number }> {
  const queue = await getMobileOfflineMessageQueue();
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
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
  } catch (err) {
    console.warn('[mobileChatStorage] Failed to update queue after sync:', err);
  }

  return { syncedCount, errors };
}
