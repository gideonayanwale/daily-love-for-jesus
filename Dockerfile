# ==============================================================================
# DAILY LOVE FOR JESUS - FULL-STACK PRODUCTION MULTI-STAGE DOCKERFILE
# Node.js v24 Alpine Base
# ==============================================================================

# ── Stage 1: Build Frontend React SPA ─────────────────────────────────────────
FROM node:24-alpine AS frontend-builder
WORKDIR /workspace

# Copy dependencies definitions
COPY package.json ./
COPY app/package.json ./app/

# Install frontend dependencies
RUN npm --prefix app install --legacy-peer-deps

# Copy app source code and build Vite SPA
COPY app/ ./app/
COPY backend/src/modules/trpc/trpc.router.ts ./backend/src/modules/trpc/trpc.router.ts
RUN npm --prefix app run build

# ── Stage 2: Build Backend NestJS Application ─────────────────────────────────
FROM node:24-alpine AS backend-builder
WORKDIR /workspace

COPY package.json ./
COPY backend/package.json ./backend/

# Install backend dependencies
RUN npm --prefix backend install --legacy-peer-deps

# Copy backend source
COPY backend/ ./backend/
COPY --from=frontend-builder /workspace/app/dist/public ./app/dist/public

# Build TypeScript to backend/dist
RUN npx --prefix backend tsc --project backend/tsconfig.json

# ── Stage 3: Production Minimal Runtime ───────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY package.json ./
COPY backend/package.json ./backend/
RUN npm --prefix backend install --only=production --legacy-peer-deps

# Copy built backend files
COPY --from=backend-builder /workspace/backend/dist ./backend/dist
# Copy built SPA static files (served by NestJS Express static middleware in production)
COPY --from=frontend-builder /workspace/app/dist/public ./app/dist/public

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/sync/health || exit 1

EXPOSE 4000

WORKDIR /app/backend
CMD ["node", "dist/main.js"]
