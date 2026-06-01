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
RUN turbo prune lynx-bot --docker

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
RUN pnpm turbo run build --filter=lynx-bot

# Stage 5: Runner
FROM base AS runner
WORKDIR /app

# Install yt-dlp from Alpine community repo
RUN apk add --no-cache yt-dlp ffmpeg

# Tell yt-dlp-exec to use system binary instead of its bundled one
ENV YOUTUBE_DL_DIR=/usr/bin
ENV YOUTUBE_DL_FILENAME=yt-dlp

COPY --from=builder /app .

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "lynx-bot", "start"]