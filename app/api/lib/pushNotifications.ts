import { getDb } from "../queries/connection";
import { pushTokens, notifications, groupMembers } from "@db/schema";
import { eq, inArray, and } from "drizzle-orm";

interface SendPushOptions {
  userIds?: string[];
  groupId?: number;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
  category?: string;
}

/**
 * Sends targeted push notifications to Expo client devices and stores in-app notifications.
 */
export async function sendTargetedPushNotification(options: SendPushOptions) {
  const db = await getDb();
  let recipientIds = options.userIds ?? [];

  // If groupId is provided, resolve all active group members
  if (options.groupId && recipientIds.length === 0) {
    const members = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, options.groupId), eq(groupMembers.status, "active")));

    recipientIds = members.map((m) => m.userId);
  }

  if (recipientIds.length === 0) {
    return { sent: 0, recipientCount: 0 };
  }

  // 1. Create in-app notifications for each recipient
  const notificationRows = recipientIds.map((userId) => ({
    userId,
    groupId: options.groupId ?? null,
    title: options.title,
    body: options.body,
    category: options.category ?? "announcement",
    resourceType: options.data?.resourceType ?? (options.groupId ? "group" : "platform"),
    resourceId: options.data?.resourceId ? String(options.data.resourceId) : null,
    isRead: false,
  }));

  // Treat the in-app feed as part of the operation's success contract. Do not
  // report a broadcast as successful if its durable notification records fail.
  await db.insert(notifications).values(notificationRows);

  // 2. Fetch push tokens for recipient users
  const tokens = await db
    .select({ token: pushTokens.token, platform: pushTokens.platform })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, recipientIds));

  if (tokens.length === 0) {
    return { sent: 0, recipientCount: recipientIds.length };
  }

  // 3. Dispatch to Expo Push API in provider-sized batches.
  const messages = tokens.map((token) => ({
    to: token.token,
    sound: "default",
    title: options.title,
    body: options.body,
    data: options.data || {},
    badge: 1,
  }));

  let sent = 0;
  const failures: string[] = [];
  for (let offset = 0; offset < messages.length; offset += 100) {
    const batch = messages.slice(offset, offset + 100);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        failures.push(`HTTP ${response.status}`);
        continue;
      }
      const payload: {
        data?: Array<{ status?: string; message?: string; details?: { error?: string } }>;
      } = await response.json();
      const tickets = Array.isArray(payload.data) ? payload.data : [];
      sent += tickets.filter((ticket) => ticket.status === "ok").length;
      const rejected = tickets.filter((ticket) => ticket.status !== "ok");
      for (const ticket of rejected) {
        failures.push(ticket.details?.error ?? ticket.message ?? "Expo rejected a push notification");
      }
      if (tickets.length !== batch.length) {
        failures.push(`Expo returned ${tickets.length} tickets for ${batch.length} messages`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Unknown Expo delivery error");
    }
  }

  return {
    sent,
    recipientCount: recipientIds.length,
    ...(failures.length > 0 ? { error: failures.join("; ") } : {}),
  };
}
