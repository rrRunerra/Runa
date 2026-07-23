import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../providers/database/prisma.service';

interface MediaConfig {
  type: string;
  model: string;
  statuses: string[];
}

const MEDIA_CONFIGS: Record<string, MediaConfig> = {
  anime: {
    type: 'anime',
    model: 'aquilaAnime',
    statuses: ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
  manga: {
    type: 'manga',
    model: 'aquilaManga',
    statuses: ['PLANNING', 'READING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
  tv: {
    type: 'tv',
    model: 'aquilaTv',
    statuses: ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
  movie: {
    type: 'movie',
    model: 'aquilaMovie',
    statuses: ['PLANNING', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
  game: {
    type: 'game',
    model: 'aquilaGame',
    statuses: ['PLANNING', 'PLAYING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
  book: {
    type: 'book',
    model: 'aquilaBook',
    statuses: ['PLANNING', 'READING', 'COMPLETED', 'ON_HOLD', 'DROPPED'],
  },
};

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomScore(): number {
  const rand = Math.random();
  if (rand < 0.1) return getRandomInt(1, 5);
  if (rand < 0.45) return getRandomInt(6, 7);
  if (rand < 0.85) return getRandomInt(8, 9);
  return 10;
}

function generateRandomDistributions(statuses: string[]) {
  // 1. Popularity between 15 and 350
  const popularity = getRandomInt(15, 350);

  // 2. Favorites count between 0 and 30% of popularity
  const favoritesCount = getRandomInt(0, Math.floor(popularity * 0.3));

  // 3. Partition popularity across statuses
  const statusDist: Record<string, number> = {};
  let remainingPopularity = popularity;

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    if (i === statuses.length - 1) {
      statusDist[status] = remainingPopularity;
    } else {
      const share = getRandomInt(0, Math.floor(remainingPopularity * 0.6));
      statusDist[status] = share;
      remainingPopularity -= share;
    }
  }

  // 4. Generate score distribution for 60% - 95% of users
  const scoreDist: Record<string, number> = {};
  const scoredCount = getRandomInt(
    Math.floor(popularity * 0.6),
    Math.floor(popularity * 0.95),
  );

  let totalScoreSum = 0;
  for (let i = 0; i < scoredCount; i++) {
    const score = getRandomScore();
    const scoreStr = String(score);
    scoreDist[scoreStr] = (scoreDist[scoreStr] || 0) + 1;
    totalScoreSum += score;
  }

  const averageScore =
    scoredCount > 0
      ? parseFloat((totalScoreSum / scoredCount).toFixed(2))
      : 0;

  return {
    localPopularity: popularity,
    localFavoritesCount: favoritesCount,
    localAverageScore: averageScore,
    localStatusDistribution: statusDist,
    localScoreDistribution: scoreDist,
    localTotalScoreSum: totalScoreSum,
    localScoredCount: scoredCount,
  };
}

async function seedRandomMediaStats(
  prisma: PrismaService,
  config: MediaConfig,
  isDryRun: boolean,
  isVerbose: boolean,
) {
  console.log(`\n========================================`);
  console.log(`Seeding random stats directly for: ${config.type.toUpperCase()}`);
  console.log(`========================================`);

  const mediaModel = prisma.client[config.model as keyof typeof prisma.client] as any;

  const mediaItems: { id: number }[] = await mediaModel.findMany({
    select: { id: true },
  });

  console.log(`Found ${mediaItems.length} entries in ${config.model}.`);
  if (mediaItems.length === 0) return;

  const updates: Array<{ id: number; data: any }> = [];

  for (const item of mediaItems) {
    const statsData = generateRandomDistributions(config.statuses);
    updates.push({ id: item.id, data: statsData });

    if (isVerbose) {
      console.log(
        `[${config.type.toUpperCase()}] ID ${item.id} -> Pop: ${statsData.localPopularity}, Favs: ${statsData.localFavoritesCount}, AvgScore: ${statsData.localAverageScore}`,
      );
    }
  }

  console.log(`Prepared ${updates.length} random stats updates for ${config.type}.`);

  if (isDryRun) {
    console.log(`[DRY RUN] Skipping database update for ${config.type}.`);
    return;
  }

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
    console.log(`Seeded random stats for ${updatedCount}/${updates.length} ${config.type} items...`);
  }

  console.log(`Successfully seeded random stats for all ${updatedCount} ${config.type} entries.`);
}

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    console.error(
      `[SECURITY ERROR] Seeding random stats is strictly allowed ONLY in development mode (NODE_ENV=development). Current NODE_ENV: '${nodeEnv}'`,
    );
    process.exit(1);
  }

  const isDryRun = process.argv.includes('--dry-run');
  const isVerbose = process.argv.includes('--verbose');

  let mediaArg = 'all';
  const mediaParam = process.argv.find((arg) => arg.startsWith('--media='));
  if (mediaParam) {
    mediaArg = mediaParam.split('=')[1].toLowerCase();
  }

  console.log('--- Starting Randomized Media Stats Generator Script ---');
  console.log(`Environment: ${nodeEnv}`);
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
      await seedRandomMediaStats(prisma, config, isDryRun, isVerbose);
    }

    console.log('\n--- Randomized Media Stats Seeding Completed Successfully ---');
  } catch (error: any) {
    console.error('Fatal error during randomized media stats seeding:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
