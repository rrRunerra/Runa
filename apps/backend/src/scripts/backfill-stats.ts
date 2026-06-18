import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { StatsService } from '../modules/stats/stats.service';
import { PrismaService } from '../providers/database/prisma.service';

async function bootstrap() {
  console.log('--- Starting Stats Backfill Script ---');
  
  // Create NestJS standalone context (does not launch web server)
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const statsService = app.get(StatsService);

  try {
    console.log('Fetching all users from database...');
    const users = await prisma.client.user.findMany({
      select: { id: true, username: true },
    });

    console.log(`Found ${users.length} users. Starting statistics compilation...`);

    const mediaTypes = ['anime', 'manga', 'tv', 'movie', 'game', 'book'];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n[${i + 1}/${users.length}] Processing user: ${user.username} (${user.id})`);

      for (const type of mediaTypes) {
        try {
          console.log(`  - Compiling ${type} stats...`);
          // We call doRecalculate directly to execute immediately (bypassing debounce)
          await statsService.doRecalculate(user.id, type);
        } catch (err: any) {
          console.error(`  [ERROR] Failed to compile ${type} stats: ${err.message}`);
        }
      }
    }

    console.log('\n--- Stats Backfill Script Completed Successfully ---');
  } catch (error: any) {
    console.error('Fatal error during stats backfill:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
