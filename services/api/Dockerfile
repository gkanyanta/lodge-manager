FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY services/api/package.json ./services/api/
COPY packages/shared/package.json ./packages/shared/
COPY package.json ./
RUN cd services/api && npm install

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/api/node_modules ./services/api/node_modules
COPY packages/shared ./packages/shared
COPY services/api ./services/api
COPY tsconfig.base.json ./
RUN cd services/api && npx prisma generate && npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/node_modules ./node_modules
COPY --from=builder /app/services/api/prisma ./prisma
COPY --from=builder /app/services/api/package.json ./

USER nestjs

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
