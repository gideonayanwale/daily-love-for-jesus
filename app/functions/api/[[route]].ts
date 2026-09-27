// ==============================================================================
// Cloudflare Pages Functions entrypoint for Hono API
// Catch-all route for /api/* on Cloudflare Pages
// ==============================================================================

import { handle } from "hono/cloudflare-pages";
import app from "../../api/boot";

export const onRequest = handle(app);
