import { z } from "zod";
import { createRouter, elevatedAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs, users } from "@db/schema";
import { sendTargetedPushNotification } from "./lib/pushNotifications";

export const notificationRouter = createRouter({
  broadcastToUsers: elevatedAdminQuery
    .input(z.object({
      title: z.string().trim().min(1).max(255),
      body: z.string().trim().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const recipients = await db.select({ id: users.id }).from(users);
      const userIds = recipients.map((recipient) => recipient.id);
      if (userIds.length === 0) {
        return { recipientCount: 0, devicesSent: 0 };
      }

      const result = await sendTargetedPushNotification({
        userIds,
        title: input.title,
        body: input.body,
        category: "system",
        data: { category: "platform_announcement", resourceType: "platform" },
      });

      await db.insert(auditLogs).values({
        actorId: ctx.user.id,
        action: "broadcast_platform_notification",
        resourceType: "notification",
        metadata: {
          title: input.title,
          recipientCount: result.recipientCount,
          devicesSent: result.sent,
          failedDevices: result.failedDevices,
        },
        occurredAt: new Date(),
      });

      return {
        recipientCount: result.recipientCount,
        devicesSent: result.sent,
        failedDevices: result.failedDevices,
      };
    }),
});
