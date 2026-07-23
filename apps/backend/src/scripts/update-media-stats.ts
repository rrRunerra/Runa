import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../providers/database/prisma.service';

interface MediaConfig {
  type: string;
  model: string;
  listModel: string;
  idField: string;
  favType: string;
}

const MEDIA_CONFIGS: Record<string, MediaConfig> = {
  anime: {
    type: 'anime',
    model: 'aquilaAnime',
    listModel: 'aquilaAnimeUserList',
    idField: 'animeId',
    favType: 'ANIME',
  },
  manga: {
    type: 'manga',
    model: 'aquilaManga',
    listModel: 'aquilaMangaUserList',
    idField: 'mangaId',
    favType: 'MANGA',
  },
  tv: {
    type: 'tv',
    model: 'aquilaTv',
    listModel: 'aquilaTvUserList',
    idField: 'tvId',
    favType: 'TV',
  },
  movie: {
    type: 'movie',
    model: 'aquilaMovie',
    listModel: 'aquilaMovieUserList',
    idField: 'movieId',
    favType: 'MOVIE',
  },
  game: {
    type: 'game',
    model: 'aquilaGame',
    listModel: 'aquilaGameUserList',
    idField: 'gameId',
    favType: 'GAME',
  },
  book: {
    type: 'book',
    model: 'aquilaBook',
    listModel: 'aquilaBookUserList',
    idField: 'bookId',
    favType: 'BOOK',
  },
};

async function processMediaType(
  prisma: PrismaService,
  config: MediaConfig,
  isDryRun: boolean,
  isVerbose: boolean,
) {
  console.log(`\n========================================`);
  console.log(`Processing stats for: ${config.type.toUpperCase()}`);
  console.log(`========================================`);

  const mediaModel = prisma.client[config.model as keyof typeof prisma.client] as any;
  const listModel = prisma.client[config.listModel as keyof typeof prisma.client] as any;

  // 1. Fetch all media item IDs
  const allMediaItems: { id: number }[] = await mediaModel.findMany({
    select: { id: true },
  });

  console.log(`Found ${allMediaItems.length} entries in ${config.model}.`);
  if (allMediaItems.length === 0) return;

  // 2. Fetch list counts using Prisma groupBy
  console.log(`Aggregating user list counts...`);
  const listCountsGroup = await listModel.groupBy({
    by: [config.idField],
    _count: { _all: true },
  });
  const listCountsMap = new Map<number, number>();
  for (const group of listCountsGroup) {
    const id = group[config.idField];
    if (id !== null && id !== undefined) {
      listCountsMap.set(id, group._count._all);
    }
  }

  // 3. Fetch status distributions using Prisma groupBy
  console.log(`Aggregating status distributions...`);
  const statusGroup = await listModel.groupBy({
    by: [config.idField, 'status'],
    _count: { _all: true },
  });
  const statusDistMap = new Map<number, Record<string, number>>();
  for (const group of statusGroup) {
    const id = group[config.idField];
    const status = group.status;
    if (id !== null && id !== undefined && status) {
      if (!statusDistMap.has(id)) {
        statusDistMap.set(id, {});
      }
      statusDistMap.get(id)![String(status)] = group._count._all;
    }
  }

  // 4. Fetch score distributions using Prisma groupBy
  console.log(`Aggregating score distributions...`);
  const scoreGroup = await listModel.groupBy({
    where: { score: { gt: 0 } },
    by: [config.idField, 'score'],
    _count: { _all: true },
    _sum: { score: true },
  });
  const scoreDistMap = new Map<
    number,
    { dist: Record<string, number>; totalSum: number; scoredCount: number }
  >();
  for (const group of scoreGroup) {
    const id = group[config.idField];
    const score = group.score;
    if (id !== null && id !== undefined && score) {
      if (!scoreDistMap.has(id)) {
        scoreDistMap.set(id, { dist: {}, totalSum: 0, scoredCount: 0 });
      }
      const item = scoreDistMap.get(id)!;
      item.dist[String(score)] = group._count._all;
      item.totalSum += group._sum.score || 0;
      item.scoredCount += group._count._all;
    }
  }

  // 5. Fetch favorites counts
  console.log(`Aggregating favorite counts...`);
  const favoriteGroup = await prisma.client.favorite.groupBy({
    where: { type: config.favType as any },
    by: ['mediaId'],
    _count: { _all: true },
  });
  const favoriteCountsMap = new Map<string, number>();
  for (const group of favoriteGroup) {
    if (group.mediaId) {
      favoriteCountsMap.set(group.mediaId, group._count._all);
    }
  }

  // 6. Build batch updates
  console.log(`Building database updates...`);
  const updates: Array<{ id: number; data: any }> = [];

  for (const mediaItem of allMediaItems) {
    const mediaId = mediaItem.id;
    const popularity = listCountsMap.get(mediaId) || 0;
    const favoritesCount = favoriteCountsMap.get(String(mediaId)) || 0;
    const statusDist = statusDistMap.get(mediaId) || {};
    const scoreInfo = scoreDistMap.get(mediaId) || { dist: {}, totalSum: 0, scoredCount: 0 };

    const averageScore =
      scoreInfo.scoredCount > 0
        ? parseFloat((scoreInfo.totalSum / scoreInfo.scoredCount).toFixed(2))
        : 0;

    const data = {
      localPopularity: popularity,
      localFavoritesCount: favoritesCount,
      localAverageScore: averageScore,
      localStatusDistribution: statusDist,
      localScoreDistribution: scoreInfo.dist,
      localTotalScoreSum: scoreInfo.totalSum,
      localScoredCount: scoreInfo.scoredCount,
    };

    updates.push({ id: mediaId, data });

    if (isVerbose) {
      console.log(
        `[${config.type.toUpperCase()}] ID ${mediaId} -> Pop: ${popularity}, Favs: ${favoritesCount}, AvgScore: ${averageScore}, Scored: ${scoreInfo.scoredCount}`,
      );
    }
  }

  console.log(`Prepared ${updates.length} items for update.`);

  if (isDryRun) {
    console.log(`[DRY RUN] Skipping database update for ${config.type}.`);
    return;
  }

  // Execute chunked updates in transactions
  const BATCH_SIZE = 100;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const transactionQueries = chunk.map((update) =>
      mediaModel.update({
        where: { id: update.id },
        data: update.data,
      }),
    );

    await prisma.client.$transaction(transactionQueries);
    updatedCount += chunk.length;
    console.log(`Updated ${updatedCount}/${updates.length} ${config.type} items...`);
  }

  console.log(`Successfully updated all ${updatedCount} ${config.type} entries.`);
}

async function bootstrap() {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerbose = process.argv.includes('--verbose');

  let mediaArg = 'all';
  const mediaParam = process.argv.find((arg) => arg.startsWith('--media='));
  if (mediaParam) {
    mediaArg = mediaParam.split('=')[1].toLowerCase();
  }

  console.log('--- Starting Media Stats Update Script ---');
  console.log(`Target Media: ${mediaArg.toUpperCase()}`);
  if (isDryRun) {
    console.log('[MODE] DRY RUN ONLY - No database changes will be committed.');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    const selectedTypes =
      mediaArg === 'all'
        ? Object.keys(MEDIA_CONFIGS)
        : mediaArg.split(',').map((t) => t.trim().toLowerCase());

    for (const type of selectedTypes) {
      const config = MEDIA_CONFIGS[type];
      if (!config) {
        console.warn(`[WARN] Unknown media type: ${type}. Skipping.`);
        continue;
      }
      await processMediaType(prisma, config, isDryRun, isVerbose);
    }

    console.log('\n--- Media Stats Update Completed Successfully ---');
  } catch (error: any) {
    console.error('Fatal error during media stats update:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
