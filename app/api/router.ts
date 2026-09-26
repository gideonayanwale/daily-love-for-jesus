import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { bibleRouter } from "./bibleRouter";
import { hymnsRouter } from "./hymnsRouter";
import { devotionalRouter } from "./devotionalRouter";
import { telegramRouter } from "./telegramRouter";
import { favoritesRouter } from "./favoritesRouter";
import { communityRouter } from "./communityRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  bible: bibleRouter,
  hymns: hymnsRouter,
  devotional: devotionalRouter,
  telegram: telegramRouter,
  favorite: favoritesRouter,
  community: communityRouter,
});

export type AppRouter = typeof appRouter;
