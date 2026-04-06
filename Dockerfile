# Base image
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat
RUN apk update

# Stage 1: Prune monorepo
FROM base AS pruner
ARG APP_NAME
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune ${APP_NAME} --docker

# Stage 2: Install dependencies
FROM base AS installer
ARG APP_NAME
WORKDIR /app

# First copy the pruned lockfile and package.json
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy pruned source code and build the app
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# If database exists, generate prisma client
RUN if [ -d "packages/database" ]; then \
      cd packages/database && pnpm db:generate; \
    fi

RUN pnpm turbo run build --filter=${APP_NAME}

# Stage 3: Runner
FROM base AS runner
ARG APP_NAME
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer /app .

ENV NODE_ENV=production

# The start command can be overridden via ENV or docker-compose
ENV START_COMMAND="pnpm --filter ${APP_NAME} start"

CMD ["sh", "-c", "${START_COMMAND}"]
