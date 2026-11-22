import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../auth/auth.service';
import { BibleService } from '../bible/bible.service';
import { HymnsService } from '../hymns/hymns.service';
import { DevotionalsService } from '../devotionals/devotionals.service';
import { TelegramService } from '../telegram/telegram.service';
import { FavoritesService } from '../favorites/favorites.service';
import { CommunityService } from '../community/community.service';
import * as cookie from 'cookie';

export interface TrpcContext {
  req: any;
  res: any;
  user?: any;
  authError?: boolean;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
const rejectInvalidCredential = t.middleware(async ({ ctx, next }) => {
  if (ctx.authError) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired authentication token' });
  }
  return next();
});
export const publicProcedure = t.procedure.use(rejectInvalidCredential);

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireAuth);

const requireAdminRole = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !['admin', 'elevated_admin', 'superadmin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Administrator access required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const adminProcedure = protectedProcedure.use(requireAdminRole);

const requireStrictAdminRole = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !['admin', 'superadmin'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Platform administrator access required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const strictAdminProcedure = protectedProcedure.use(requireStrictAdminRole);

export function buildAppRouter(
  authService: AuthService,
  bibleService: BibleService,
  hymnsService: HymnsService,
  devotionalsService: DevotionalsService,
  telegramService: TelegramService,
  favoritesService: FavoritesService,
  communityService: CommunityService,
  databaseService: DatabaseService,
) {
  return createRouter({
    anonymousLog: createRouter({
      list: strictAdminProcedure
        .input(z.object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
        }).optional())
        .query(async ({ input }) => {
          const db = databaseService.getDb();
          const limit = input?.limit ?? 50;
          const offset = input?.offset ?? 0;
          const [items, countResult] = await Promise.all([
            db.select()
              .from(schema.auditLogs)
              .where(eq(schema.auditLogs.action, 'anonymous_visit'))
              .orderBy(desc(schema.auditLogs.occurredAt))
              .limit(limit)
              .offset(offset),
            db.select({ count: sql<number>`cast(count(*) as int)` })
              .from(schema.auditLogs)
              .where(eq(schema.auditLogs.action, 'anonymous_visit')),
          ]);
          return {
            items: items.map((row: typeof items[number]) => ({
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
    }),
    ping: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

    auth: createRouter({
      me: protectedProcedure.query((opts) => opts.ctx.user),
      updateProfile: protectedProcedure
        .input(
          z.object({
            name: z.string().min(1).max(255).optional(),
            avatar: z.string().url().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return authService.updateProfile(ctx.user.id, input);
        }),
      logout: protectedProcedure.mutation(async ({ ctx }) => {
        if (ctx.res && ctx.res.setHeader) {
          ctx.res.setHeader('Set-Cookie', [
            cookie.serialize('sb-access-token', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: true }),
            cookie.serialize('daily_love_token', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: true }),
          ]);
        }
        return { success: true };
      }),
    }),

    bible: createRouter({
      translations: publicProcedure.query(async () => {
        return bibleService.getTranslations();
      }),
      popularTranslations: publicProcedure.query(() => {
        return bibleService.getPopularTranslations();
      }),
      books: publicProcedure.query(async () => {
        return bibleService.getBooks();
      }),
      bookById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return bibleService.getBookById(input.id);
        }),
      chapters: publicProcedure
        .input(z.object({ bookNumber: z.number() }))
        .query(async ({ input }) => {
          return bibleService.getChapters(input.bookNumber);
        }),
      verses: publicProcedure
        .input(
          z.object({
            bookNumber: z.number(),
            chapter: z.number(),
            translation: z.string().optional().default('KJV'),
          }),
        )
        .query(async ({ input }) => {
          return bibleService.getChapter(input.translation, input.bookNumber, input.chapter);
        }),
      verse: publicProcedure
        .input(
          z.object({
            bookNumber: z.number(),
            chapter: z.number(),
            verse: z.number(),
            translation: z.string().optional().default('KJV'),
          }),
        )
        .query(async ({ input }) => {
          return bibleService.getVerse(
            input.translation,
            input.bookNumber,
            input.chapter,
            input.verse,
          );
        }),
      compareVerse: publicProcedure
        .input(
          z.object({
            bookNumber: z.number(),
            chapter: z.number(),
            verse: z.number(),
            translations: z.array(z.string()).optional(),
          }),
        )
        .query(async ({ input }) => {
          return bibleService.compareVerse(
            input.bookNumber,
            input.chapter,
            input.verse,
            input.translations,
          );
        }),
      search: publicProcedure
        .input(
          z.object({
            query: z.string().min(1),
            translation: z.string().optional().default('KJV'),
          }),
        )
        .query(async ({ input }) => {
          return bibleService.search(input.translation, input.query);
        }),
      randomVerse: publicProcedure
        .input(
          z
            .object({
              translation: z.string().optional().default('KJV'),
            })
            .optional(),
        )
        .query(async ({ input }) => {
          return bibleService.getRandomVerse(input?.translation || 'KJV');
        }),
    }),

    hymns: createRouter({
      list: publicProcedure
        .input(
          z
            .object({
              search: z.string().optional(),
              category: z.string().optional(),
            })
            .optional(),
        )
        .query(async ({ input }) => {
          return hymnsService.list(input?.search, input?.category);
        }),
      byId: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return hymnsService.getById(input.id);
        }),
      byNumber: publicProcedure
        .input(z.object({ hymnNumber: z.number() }))
        .query(async ({ input }) => {
          return hymnsService.getByNumber(input.hymnNumber);
        }),
      random: publicProcedure.query(async () => {
        return hymnsService.getRandom();
      }),
      categories: publicProcedure.query(async () => {
        return hymnsService.getCategories();
      }),
    }),

    devotional: createRouter({
      today: publicProcedure.query(async () => {
        return devotionalsService.getToday();
      }),
      byId: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return devotionalsService.getById(input.id);
        }),
      list: publicProcedure
        .input(
          z
            .object({
              limit: z.number().min(1).max(100).default(20),
              offset: z.number().min(0).default(0),
            })
            .optional(),
        )
        .query(async ({ input }) => {
          return devotionalsService.list(input?.limit ?? 20, input?.offset ?? 0);
        }),
      create: adminProcedure
        .input(
          z.object({
            title: z.string().min(1),
            scripture: z.string().optional(),
            scriptureText: z.string().optional(),
            body: z.string().min(1),
            reflection: z.string().optional(),
            prayer: z.string().optional(),
            author: z.string().optional(),
            source: z.enum(['telegram', 'manual', 'api']).default('manual'),
            devotionalDate: z.date().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          return devotionalsService.create(input as any);
        }),
    }),

    telegram: createRouter({
      webhook: adminProcedure
        .input(
          z.object({
            updateId: z.number(),
            message: z
              .object({
                messageId: z.number(),
                chat: z.object({ id: z.number(), title: z.string().optional() }),
                from: z
                  .object({
                    id: z.number(),
                    firstName: z.string(),
                    username: z.string().optional(),
                  })
                  .optional(),
                text: z.string().optional(),
                caption: z.string().optional(),
                date: z.number(),
              })
              .optional(),
            channelPost: z
              .object({
                messageId: z.number(),
                chat: z.object({ id: z.number(), title: z.string().optional() }),
                text: z.string().optional(),
                caption: z.string().optional(),
                date: z.number(),
              })
              .optional(),
          }),
        )
        .mutation(async ({ input }) => {
          return telegramService.handleWebhookUpdate(input);
        }),
      messages: adminProcedure
        .input(
          z
            .object({
              limit: z.number().min(1).max(100).default(20),
              offset: z.number().min(0).default(0),
              processed: z.boolean().optional(),
            })
            .optional(),
        )
        .query(async ({ input }) => {
          return telegramService.listMessages(
            input?.limit ?? 20,
            input?.offset ?? 0,
            input?.processed,
          );
        }),
      processMessage: adminProcedure
        .input(z.object({ messageId: z.number() }))
        .mutation(async ({ input }) => {
          return telegramService.processMessage(input.messageId);
        }),
    }),

    favorite: createRouter({
      list: protectedProcedure
        .input(z.object({
          type: z.enum(['verse', 'hymn', 'devotional']).optional(),
        }))
        .query(async ({ ctx, input }) => {
          return favoritesService.list(ctx.user.id, input.type);
        }),
      add: protectedProcedure
        .input(z.object({
          type: z.enum(['verse', 'hymn', 'devotional']),
          itemId: z.number().int().positive(),
          reference: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return favoritesService.add(ctx.user.id, input as any);
        }),
      remove: protectedProcedure
        .input(z.object({
          type: z.enum(['verse', 'hymn', 'devotional']),
          itemId: z.number().int().positive(),
        }))
        .mutation(async ({ ctx, input }) => {
          return favoritesService.remove(ctx.user.id, input.type, input.itemId);
        }),
    }),

    community: createRouter({
      myCommunities: protectedProcedure.query(async ({ ctx }) => {
        return communityService.getMyCommunities(ctx.user.id);
      }),
      myGroups: protectedProcedure.query(async ({ ctx }) => {
        return communityService.getMyGroups(ctx.user.id);
      }),
      groupDetails: protectedProcedure
        .input(z.object({ groupId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          return communityService.getGroupDetails(ctx.user.id, input.groupId);
        }),
      teacherOverview: protectedProcedure
        .input(z.object({ groupId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          return communityService.getTeacherOverview(ctx.user.id, input.groupId);
        }),
      registerPushToken: protectedProcedure
        .input(
          z.object({
            token: z.string().min(10),
            platform: z.enum(['expo', 'fcm', 'apns']).default('expo'),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          return communityService.registerPushToken(ctx.user.id, input.token, input.platform);
        }),
    }),
  });
}

export type AppRouter = ReturnType<typeof buildAppRouter>;
