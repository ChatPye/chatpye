# Use a more recent and secure version of Node.js
FROM node:20-alpine3.18 AS base

# Install required packages
RUN apk add --no-cache wget ca-certificates

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Accept API keys as build arguments
ARG OPENAI_API_KEY
ARG ANTHROPIC_API_KEY
ARG GEMINI_API_KEY
ARG GOOGLE_AI_KEY
ARG YOUTUBE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_GEMINI_API_KEY
# Set them as environment variables for the build
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV GOOGLE_AI_KEY=$GOOGLE_AI_KEY
ENV YOUTUBE_API_KEY=$YOUTUBE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user with specific UID/GID
RUN apk add --no-cache shadow bash && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/bash nextjs && \
    mkdir .next && \
    chown nextjs:nodejs .next

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set proper permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Use node with proper security flags
CMD ["node", "server.js"] 