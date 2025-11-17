# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app

RUN npm i -g corepack@latest
RUN apk add --no-cache libc6-compat

# Stage 2: Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Stage 3: Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx eslint . --fix
RUN npm run build

# Remove cache
RUN rm -rf .next/cache

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy production files only
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
