import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../providers/database/prisma.service';

interface FribbAnimeMapping {
  anilist_id?: number;
  mal_id?: number;
  tvdb_id?: number;
  title?: string;
}

async function fetchFribbMappings(): Promise<Map<number, number>> {
  console.log('Fetching AniList -> TVDB mappings from Fribb anime-lists repository...');
  const res = await fetch(
    'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json',
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Fribb anime mappings: ${res.statusText}`);
  }
  const data = (await res.json()) as FribbAnimeMapping[];
  const mappingMap = new Map<number, number>();

  for (const item of data) {
    if (item.anilist_id && item.tvdb_id) {
      mappingMap.set(item.anilist_id, item.tvdb_id);
    }
  }

  console.log(`Loaded ${mappingMap.size} AniList -> TVDB mappings from Fribb.`);
  return mappingMap;
}

async function bootstrap() {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerbose = process.argv.includes('--verbose');

  console.log('--- Starting Anime TVDB ID Fetch and Update Script ---');
  if (isDryRun) {
    console.log('[MODE] DRY RUN ONLY - No database changes will be committed.');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    const fribbMap = await fetchFribbMappings();

    console.log('\nFetching anime user list entries from database...');
    const animeEntries = await prisma.client.aquilaAnimeUserList.findMany({
      select: {
        id: true,
        username: true,
        animeId: true,
        connections: true,
        anime: {
          select: {
            id: true,
            anilistId: true,
            titleEnglish: true,
            titleRomaji: true,
          },
        },
      },
    });

    console.log(`Found ${animeEntries.length} total anime list entries in database.`);

    let updatedCount = 0;
    let resolvedCount = 0;
    let fallbackCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < animeEntries.length; i++) {
      const entry = animeEntries[i];
      const connectionsObj = (entry.connections as Record<string, unknown>) || {};
      const title =
        entry.anime?.titleEnglish ||
        entry.anime?.titleRomaji ||
        `Anime #${entry.animeId}`;

      let tvdbId: number | null = null;

      // 1. Resolve from Fribb mapping first
      if (entry.anime?.anilistId) {
        const resolved = fribbMap.get(entry.anime.anilistId);
        if (resolved) {
          tvdbId = resolved;
          resolvedCount++;
        }
      }

      // 2. Fall back to existing connections.tvdbId if Fribb has no mapping
      if (!tvdbId && typeof connectionsObj.tvdbId === 'number') {
        tvdbId = connectionsObj.tvdbId;
        fallbackCount++;
      }

      if (tvdbId) {
        if (isVerbose || isDryRun) {
          console.log(
            `[${i + 1}/${animeEntries.length}] Updating Entry #${entry.id} (${entry.username} - "${title}"): Setting connections.tvdbId = ${tvdbId}`,
          );
        }

        if (!isDryRun) {
          await prisma.client.aquilaAnimeUserList.update({
            where: { id: entry.id },
            data: {
              connections: {
                ...connectionsObj,
                tvdbId,
              },
            },
          });
        }
        updatedCount++;
      } else {
        skippedCount++;
        if (isVerbose) {
          console.log(
            `[${i + 1}/${animeEntries.length}] Entry #${entry.id} ("${title}") has no TVDB ID available.`,
          );
        }
      }
    }

    console.log('\n--- Processing Summary ---');
    console.log(`Total Anime List Entries: ${animeEntries.length}`);
    console.log(`Resolved via Fribb Mapping: ${resolvedCount}`);
    console.log(`Retained Existing TVDB IDs: ${fallbackCount}`);
    console.log(`Total Updated Entries: ${updatedCount} ${isDryRun ? '(Dry Run)' : ''}`);
    console.log(`Skipped (No TVDB ID Found): ${skippedCount}`);
    console.log('\n--- Script Completed Successfully ---');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Fatal error during anime TVDB update script:', message);
  } finally {
    await app.close();
  }
}

bootstrap();
