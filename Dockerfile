# TrueVow Customer Portal — Dockerfile
# Build context: parent directory (includes shared-libraries/ and portal repo)
# Build: docker build -f Truevow_Tenant_Customer_Portal_Service/Dockerfile -t truevow-portal .
#
# Monorepo-aware: resolves @truevow/auth and @truevow/rbac-engine from
# shared-libraries/ in the build context. No manual copying required.

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY Truevow_Tenant_Customer_Portal_Service/package.json Truevow_Tenant_Customer_Portal_Service/package-lock.json ./

RUN npm ci --only=production --ignore-scripts

# Stage 2: Builder — needs shared-libraries in context
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY Truevow_Tenant_Customer_Portal_Service/package.json Truevow_Tenant_Customer_Portal_Service/package-lock.json ./
# Copy shared libraries so file: deps resolve
COPY shared-libraries shared-libraries
RUN npm ci --ignore-scripts

COPY Truevow_Tenant_Customer_Portal_Service/ .

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3031

ENV PORT=3031
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3031/api/health || exit 1

CMD ["node", "server.js"]
