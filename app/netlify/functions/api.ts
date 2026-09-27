// ==============================================================================
// Netlify Functions (v2) entrypoint for Hono API
// Routes all /api/* requests to Hono backend
// ==============================================================================

import { handle } from "hono/netlify";
import app from "../../api/boot";

export const handler = handle(app);
export default handle(app);

// Modern Netlify Functions v2 path configuration
export const config = {
  path: "/api/*",
};
