# Multi-stage production Dockerfile for Daily Love NestJS Backend
# Uses modern Node.js 24 Alpine for minimal image size and maximum speed
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

# Copy root monorepo package manifests
COPY package*.json ./
COPY app/package*.json ./app/
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN npm --prefix backend install --legacy-peer-deps

# Copy backend source code & tsconfig
COPY backend ./backend
COPY app/contracts ./app/contracts
COPY app/db ./app/db

# Compile TypeScript
RUN npm --prefix backend run build

# Production runtime stage
FROM node:24-alpine AS runner

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=4000

# Install curl for health checks
RUN apk --no-cache add curl

# Copy compiled artifacts and production dependencies
COPY --from=builder /usr/src/app/backend/package*.json ./
RUN npm install --only=production --legacy-peer-deps

COPY --from=builder /usr/src/app/backend/dist ./dist
COPY --from=builder /usr/src/app/app/db/data ./app/db/data

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/sync/health || exit 1

CMD ["node", "dist/main"]
