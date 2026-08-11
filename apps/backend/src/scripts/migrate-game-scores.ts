import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { StatsService } from '../modules/stats/stats.service';
import { PrismaService } from '../providers/database/prisma.service';
import { MediaStatsService } from '../modules/list/media-stats.service';

async function bootstrap() {
  console.log('--- Starting Game Scores Migration Script (0-100 -> 0-10) ---');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const statsService = app.get(StatsService);
  const mediaStatsService = app.get(MediaStatsService);

  try {
    // 1. Find all game user list entries with score > 10
    const entriesToMigrate = await prisma.client.aquilaGameUserListV2.findMany({
      where: {
        score: {
          gt: 10,
        },
      },
      select: {
        id: true,
        username: true,
        gameId: true,
        score: true,
      },
    });

    console.log(
      `Found ${entriesToMigrate.length} game user list entries with score > 10.`,
    );

    const affectedGameIds = new Set<number>();
    const affectedUsernames = new Set<string>();

    for (const entry of entriesToMigrate) {
      if (entry.score !== null && entry.score > 10) {
        const newScore = parseFloat((entry.score / 10).toFixed(2));
        console.log(
          `  - User ${entry.username}, Game ID ${entry.gameId}: ${entry.score} -> ${newScore}`,
        );

        await prisma.client.aquilaGameUserListV2.update({
          where: { id: entry.id },
          data: { score: newScore },
        });

        affectedGameIds.add(entry.gameId);
        affectedUsernames.add(entry.username);
      }
    }

    // 2. Recalculate media stats for affected games
    console.log(
      `\nRecalculating media statistics for ${affectedGameIds.size} affected games...`,
    );
    for (const gameId of affectedGameIds) {
      try {
        await mediaStatsService.recalculateStatsFull('game', gameId);
      } catch (err: any) {
        console.error(
          `Failed to recalculate stats for game ID ${gameId}: ${err.message}`,
        );
      }
    }

    // 3. Recalculate user stats for all users (or affected users)
    console.log('\nFetching all users to recalculate game user stats...');
    const users = await prisma.client.user.findMany({
      select: { id: true, username: true },
    });

    for (const user of users) {
      try {
        console.log(`  - Recalculating game stats for ${user.username}...`);
        await statsService.doRecalculate(user.id, 'game');
      } catch (err: any) {
        console.error(
          `Failed to recalculate stats for user ${user.username}: ${err.message}`,
        );
      }
    }

    console.log(
      '\n--- Game Scores Migration Script Completed Successfully ---',
    );
  } catch (error: any) {
    console.error('Fatal error during game scores migration:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
