# Stage 1: Base
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable && pnpm --version
RUN apk add --no-cache libc6-compat
RUN apk update

# Stage 2: Pruner
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune frontend --docker

# Stage 3: Installer
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Stage 4: Builder
FROM base AS builder
WORKDIR /app
COPY --from=installer /app .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
COPY tsconfig.json tsconfig.json
RUN cd packages/database && pnpm exec prisma generate
# Next.js build requires env vars for build-time optimization, but we usually handle them via ENV in compose

ARG DATABASE_URL
ARG NEXT_PUBLIC_URL
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL
ARG NEST_PORT
ARG NEXTAUTH_SECRET

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEST_PORT=${NEST_PORT}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Verify that essential URL variables are not empty before building
RUN if [ -z "$DATABASE_URL" ] || [ -z "$NEXTAUTH_URL" ] || [ -z "$NEXT_PUBLIC_API_URL" ] || [ -z "$NEXT_PUBLIC_URL" ] || [ -z "$NEXTAUTH_SECRET" ]; then \
    echo "ERROR: Essential build-time environment variables are missing!" && \
    echo "DATABASE_URL: ${DATABASE_URL:-(empty)}" && \
    echo "NEXT_PUBLIC_URL: ${NEXT_PUBLIC_URL:-(empty)}" && \
    echo "NEXTAUTH_URL: ${NEXTAUTH_URL:-(empty)}" && \
    echo "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-(empty)}" && \
    echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-(empty)}" && \
    exit 1; \
    fi

RUN pnpm turbo run build --filter=frontend

# Stage 5: Runner
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder --chown=nextjs:nodejs /app .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "frontend", "start"]
