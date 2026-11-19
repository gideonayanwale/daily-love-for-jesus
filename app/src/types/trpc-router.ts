import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

const t = initTRPC.create({ transformer: superjson });

export const appRouter = t.router({
  ping: t.procedure.query(() => ({ ok: true, ts: Date.now() })),
  auth: t.router({
    me: t.procedure.query(() => ({} as any)),
    updateProfile: t.procedure
      .input(
        z.object({
          name: z.string().optional(),
          avatar: z.string().optional(),
        }).optional(),
      )
      .mutation(async () => ({} as any)),
    logout: t.procedure.mutation(async () => ({ success: true })),
    promoteToElevatedAdmin: t.procedure
      .input(z.object({ userId: z.string() }))
      .mutation(async () => ({ success: true })),
  }),
  bible: t.router({
    translations: t.procedure.query(async () => [] as any[]),
    popularTranslations: t.procedure.query(() => [] as any[]),
    books: t.procedure.query(async () => [] as any[]),
    bookById: t.procedure
      .input(z.object({ id: z.number() }))
      .query(async () => ({} as any)),
    chapters: t.procedure
      .input(z.object({ bookNumber: z.number() }))
      .query(async () => [] as number[]),
    verses: t.procedure
      .input(
        z.object({
          bookNumber: z.number().optional(),
          chapter: z.number().optional(),
          translation: z.string().optional(),
        }),
      )
      .query(async () => [] as any[]),
    verse: t.procedure
      .input(
        z.object({
          bookNumber: z.number().optional(),
          chapter: z.number().optional(),
          verse: z.number().optional(),
          translation: z.string().optional(),
        }),
      )
      .query(async () => ({} as any)),
    compareVerse: t.procedure
      .input(
        z.object({
          bookNumber: z.number().optional(),
          chapter: z.number().optional(),
          verse: z.number().optional(),
          translations: z.array(z.string()).optional(),
        }),
      )
      .query(async () => [] as any[]),
    search: t.procedure
      .input(
        z.object({
          query: z.string().min(1),
          translation: z.string().optional(),
        }),
      )
      .query(async () => [] as any[]),
    randomVerse: t.procedure
      .input(
        z.object({
          translation: z.string().optional(),
        }).optional(),
      )
      .query(async () => ({} as any)),
  }),
  hymns: t.router({
    list: t.procedure
      .input(
        z.object({
          search: z.string().optional(),
          category: z.string().optional(),
        }).optional(),
      )
      .query(async () => [] as any[]),
    byId: t.procedure
      .input(z.object({ id: z.number().optional() }))
      .query(async () => ({} as any)),
    byNumber: t.procedure
      .input(z.object({ hymnNumber: z.number().optional() }))
      .query(async () => ({} as any)),
    random: t.procedure.query(async () => ({} as any)),
    categories: t.procedure.query(async () => [] as string[]),
  }),
  devotional: t.router({
    today: t.procedure.query(async () => ({} as any)),
    byId: t.procedure
      .input(z.object({ id: z.number().optional() }))
      .query(async () => ({} as any)),
    list: t.procedure
      .input(
        z.object({
          limit: z.number().optional(),
          offset: z.number().optional(),
          publishedOnly: z.boolean().optional(),
        }).optional(),
      )
      .query(async () => ({ items: [] as any[], total: 0 })),
    create: t.procedure.input(z.any()).mutation(async () => ({} as any)),
    update: t.procedure
      .input(z.object({ id: z.number(), data: z.any() }))
      .mutation(async () => ({} as any)),
    delete: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async () => ({ success: true })),
    publish: t.procedure
      .input(z.object({ id: z.number() }))
      .mutation(async () => ({} as any)),
  }),
  telegram: t.router({
    webhook: t.procedure.input(z.any()).mutation(async () => ({} as any)),
    messages: t.procedure.input(z.any()).query(async () => ({ items: [] as any[], total: 0 })),
    processMessage: t.procedure.input(z.any()).mutation(async () => ({} as any)),
  }),
  media: t.router({
    uploadUrl: t.procedure
      .input(z.object({ fileName: z.string(), mimeType: z.string(), folder: z.string().optional() }))
      .mutation(async () => ({ uploadUrl: '' as string, fields: {} as Record<string, string | number> })),
    archiveToSupabase: t.procedure
      .input(z.object({ cloudinaryUrl: z.string(), fileName: z.string() }))
      .mutation(async () => ({ supabaseUrl: '' as string })),
  }),
  favorite: t.router({
    list: t.procedure.input(z.any()).query(async () => [] as any[]),
    add: t.procedure.input(z.any()).mutation(async () => ({} as any)),
    remove: t.procedure.input(z.any()).mutation(async () => ({ success: true })),
  }),
  community: t.router({
    myCommunities: t.procedure.query(async () => [] as any[]),
    myGroups: t.procedure.query(async () => [] as any[]),
    groupDetails: t.procedure.input(z.any()).query(async () => ({} as any)),
    teacherOverview: t.procedure.input(z.any()).query(async () => ({} as any)),
    registerPushToken: t.procedure.input(z.any()).mutation(async () => ({ success: true })),
  }),
  teacherAssignment: t.router({
    listGroups: t.procedure.query(async () => [] as any[]),
    listEligibleUsers: t.procedure
      .input(z.object({ groupId: z.number() }))
      .query(async () => [] as any[]),
    assign: t.procedure
      .input(z.object({ groupId: z.number(), userId: z.string() }))
      .mutation(async () => ({ success: true })),
    remove: t.procedure
      .input(z.object({ groupId: z.number(), userId: z.string() }))
      .mutation(async () => ({ success: true })),
  }),
  anonymousLog: t.router({
    list: t.procedure
      .input(
        z.object({
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async () => ({ items: [] as any[], total: 0 })),
  }),
});

export type AppRouter = typeof appRouter;
