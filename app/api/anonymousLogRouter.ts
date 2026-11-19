import { createRouter, strictAdminQuery } from './middleware';
import { getDb } from './queries/connection';
import { auditLogs } from '@db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

export const anonymousLogRouter = createRouter({
  list: strictAdminQuery
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.action, 'anonymous_visit'))
          .orderBy(desc(auditLogs.occurredAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(auditLogs)
          .where(eq(auditLogs.action, 'anonymous_visit')),
      ]);

      return {
        items: items.map((row) => ({
          id: row.id,
          ipAddress: row.ipAddress,
          resourceId: row.resourceId,
          userAgent: row.userAgent,
          metadata: row.metadata,
          occurredAt: row.occurredAt,
        })),
        total: countResult[0]?.count ?? 0,
      };
    }),
});
