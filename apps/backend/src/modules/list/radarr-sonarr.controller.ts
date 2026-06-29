import {
  Controller,
  Get,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { PrismaService } from '../../providers/database/prisma.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';

// Simple in-memory cache for Fribb's AniList -> TVDB mapping
class AnimeMappingCache {
  private static mappings: Map<number, number> | null = null;
  private static lastFetched = 0;
  private static isFetching = false;

  public static async getTvdbId(anilistId: number): Promise<number | null> {
    const now = Date.now();
    if (
      (!this.mappings || now - this.lastFetched > 24 * 60 * 60 * 1000) &&
      !this.isFetching
    ) {
      this.isFetching = true;
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json',
        );
        const list = await res.json();
        const newMap = new Map<number, number>();
        for (const item of list) {
          if (item.anilist_id && item.thetvdb_id) {
            newMap.set(item.anilist_id, item.thetvdb_id);
          }
        }
        this.mappings = newMap;
        this.lastFetched = now;
      } catch (err) {
        console.error('Failed to fetch anime mapping from Fribb:', err);
      } finally {
        this.isFetching = false;
      }
    }
    return this.mappings?.get(anilistId) || null;
  }
}

@Controller()
@UseGuards(DualAuthGuard)
export class RadarrSonarrController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movieService: MovieService,
    private readonly tvService: TvService,
  ) {}

  private readonly logger = new Logger(RadarrSonarrController.name);

  // ─────────────────────────── RADARR (MOVIES) ───────────────────────────

  @Get(['radarr/api/v3/movie', 'api/v3/movie'])
  public async getRadarrMovieList(@Req() req: any) {
    const username = req.user.username;
    this.logger.log(`Fetching Radarr movie list for user ${username}`);

    const movieEntries = await this.prisma.client.aquilaMovieUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: { not: 'DROPPED' },
      },
      include: {
        movie: true,
      },
    });

    const resultList: any[] = [];

    for (const entry of movieEntries) {
      let tmdbId: number | undefined;
      let imdbId: string | undefined;

      const connectionsObj = (entry.connections as Record<string, any>) || {};

      if (connectionsObj.tmdbId) {
        tmdbId = connectionsObj.tmdbId;
        imdbId = connectionsObj.imdbId;
      } else {
        // Resolve dynamically from TVDB API
        const remoteIds = await this.movieService.getRemoteIds(entry.tvdbId);
        if (remoteIds) {
          tmdbId = remoteIds.tmdbId;
          imdbId = remoteIds.imdbId;

          // Cache in database
          try {
            await this.prisma.client.aquilaMovieUserList.update({
              where: { id: entry.id },
              data: {
                connections: {
                  ...connectionsObj,
                  tmdbId,
                  imdbId,
                },
              },
            });
          } catch (dbErr) {
            this.logger.error(
              `Failed to save resolved movie IDs for entry ${entry.id}:`,
              dbErr,
            );
          }
        }
      }

      if (tmdbId) {
        const title = entry.movie.titleEnglish || entry.movie.titleRomaji || 'Unknown Movie';
        resultList.push({
          title,
          tmdbId,
          imdbId: imdbId || null,
          year: 0, // Radarr matches perfectly without year if tmdbId is present
          monitored: true,
          id: tmdbId, // ID matching for list sync compatibility
        });
      }
    }

    return resultList;
  }

  @Get(['radarr/api/v3/qualityprofile', 'api/v3/qualityprofile'])
  public getRadarrQualityProfiles() {
    return [
      {
        id: 1,
        name: 'Any',
      },
    ];
  }

  // ─────────────────────────── SONARR (TV & ANIME) ───────────────────────────

  @Get(['sonarr/api/v3/series', 'api/v3/series'])
  public async getSonarrSeriesList(@Req() req: any) {
    const username = req.user.username;
    this.logger.log(`Fetching Sonarr TV/Anime list for user ${username}`);

    // Fetch TV show entries (which natively store tvdbId)
    const tvEntries = await this.prisma.client.aquilaTvUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: { not: 'DROPPED' },
      },
      include: {
        tv: true,
      },
    });

    // Fetch Anime entries (which store anilistId)
    const animeEntries = await this.prisma.client.aquilaAnimeUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: { not: 'DROPPED' },
      },
      include: {
        anime: true,
      },
    });

    const resultList: any[] = [];

    // Process TV Shows
    for (const entry of tvEntries) {
      const title = entry.tv.titleEnglish || entry.tv.titleRomaji || 'Unknown TV Show';
      resultList.push({
        title,
        tvdbId: entry.tvdbId,
        year: 0,
        monitored: true,
        seasons: [],
      });
    }

    // Process Anime
    for (const entry of animeEntries) {
      if (!entry.anilistId) continue;

      let tvdbId: number | null = null;
      const connectionsObj = (entry.connections as Record<string, any>) || {};

      if (connectionsObj.tvdbId) {
        tvdbId = connectionsObj.tvdbId;
      } else {
        // Resolve using Fribb's mapping
        const resolvedId = await AnimeMappingCache.getTvdbId(entry.anilistId);
        if (resolvedId) {
          tvdbId = resolvedId;

          // Cache in database
          try {
            await this.prisma.client.aquilaAnimeUserList.update({
              where: { id: entry.id },
              data: {
                connections: {
                  ...connectionsObj,
                  tvdbId,
                },
              },
            });
          } catch (dbErr) {
            this.logger.error(
              `Failed to save resolved anime TVDB ID for entry ${entry.id}:`,
              dbErr,
            );
          }
        }
      }

      if (tvdbId) {
        const title = entry.anime.titleEnglish || entry.anime.titleRomaji || 'Unknown Anime';
        resultList.push({
          title,
          tvdbId,
          year: entry.anime.seasonYear || 0,
          monitored: true,
          seasons: [],
        });
      }
    }

    return resultList;
  }

  @Get(['sonarr/api/v3/qualityprofile', 'api/v3/qualityprofile'])
  public getSonarrQualityProfiles() {
    return [
      {
        id: 1,
        name: 'Any',
      },
    ];
  }
}
