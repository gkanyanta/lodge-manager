FROM node:20-alpine AS base

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and prisma
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.build.json nest-cli.json ./

# Generate Prisma client and build
RUN npx prisma generate
RUN npx nest build --tsc -p tsconfig.build.json

# Production
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./

# Ensure nestjs user can write to prisma engines for migrate
RUN chown -R nestjs:nodejs /app/node_modules/@prisma

USER nestjs

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
