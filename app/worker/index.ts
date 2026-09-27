// ==============================================================================
// Cloudflare Worker Entrypoint: Daily Love For Jesus
// Unified edge worker for Hono API endpoints & static assets with SPA routing
// ==============================================================================

import app from "../api/boot";

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  // Environment variables / secrets
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  NEON_DATABASE_URL?: string;
  APP_ID?: string;
  APP_SECRET?: string;
  ADMIN_USER_ID?: string;
  ADMIN_EMAIL?: string;
  API_BIBLE_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHANNEL_ID?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route all /api/* endpoints to Hono
    if (url.pathname.startsWith("/api")) {
      return app.fetch(request, env, ctx);
    }

    // 2. Serve static assets via Cloudflare Assets binding if present
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      // If found, return asset immediately
      if (response.status !== 404) {
        return response;
      }
      // SPA Fallback: non-API unknown routes serve /index.html
      const spaRequest = new Request(new URL("/", request.url), request);
      return env.ASSETS.fetch(spaRequest);
    }

    // 3. Fallback to Hono router
    return app.fetch(request, env, ctx);
  },
};
