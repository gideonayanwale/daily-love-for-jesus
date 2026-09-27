// Vercel Serverless Function entrypoint for Hono API
import { handle } from "hono/vercel";
import app from "./boot";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);

export default handle(app);
