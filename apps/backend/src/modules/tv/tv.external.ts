import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { TvSearchEntity } from './tv.entities';
import { Prisma } from '@runa/database';
import type {
  TvdbSearchResponse,
  TvdbSeriesResponse,
  TvdbTranslationResponse,
  TvdbEpisodesResponse,
  TvdbSeriesExtended,
  TvdbEpisode,
  TvdbLoginResponse,
} from './tv.types';

@Injectable()
export class TvExternal {
  private readonly logger = new Logger(TvExternal.name);
  private readonly moduleCode = 'TvExt-';
  private readonly baseUrl = 'https://api4.thetvdb.com/v4';
  private token: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureToken(): Promise<void> {
    if (this.token) return;
    await this.login();
  }

  private async login(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: process.env.THETVDB_KEY }),
    });
    const data = (await res.json()) as TvdbLoginResponse;
    if (!data.data?.token) {
      throw new rrError(`${this.moduleCode}LGF001`, {
        message: 'Failed to login to TVDB',
      });
    }
    this.token = data.data.token;
  }

  private async tvdbFetch<T>(url: string, retries = 1): Promise<T> {
    await this.ensureToken();
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (res.status === 401 && retries > 0) {
      this.token = null;
      await this.ensureToken();
      return this.tvdbFetch<T>(url, retries - 1);
    }
    return res.json() as Promise<T>;
  }

  public async fetchAndUpsertTv(tvdbId: number): Promise<void> {
    try {
      const [seriesData, transData, episodesData] = await Promise.all([
        this.tvdbFetch<TvdbSeriesResponse>(
          `${this.baseUrl}/series/${tvdbId}/extended`,
        ),
        this.tvdbFetch<TvdbTranslationResponse>(
          `${this.baseUrl}/series/${tvdbId}/translations/eng`,
        ),
        this.tvdbFetch<TvdbEpisodesResponse>(
          `${this.baseUrl}/series/${tvdbId}/episodes/official/eng`,
        ),
      ]);

      if (!seriesData.data) {
        throw new rrError(`${this.moduleCode}TSNF001`, {
          message: `TV series with TVDB ID ${tvdbId} not found`,
        });
      }

      await this.upsertTv(
        seriesData.data,
        transData.data,
        episodesData.data?.episodes || [],
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch TV series ${tvdbId} from TVDB: ${message}`,
      );
      throw new rrError(`${this.moduleCode}FTFTS001`, {
        message: 'Failed to fetch TV series from TVDB',
      });
    }
  }

  public async search(query: string): Promise<TvSearchEntity[]> {
    try {
      this.logger.debug('Searching for TV series in TVDB');
      const data = await this.tvdbFetch<TvdbSearchResponse>(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&type=series&language=eng`,
      );

      if (data.status === 'error' || !data.data) {
        return [];
      }

      return (
        await Promise.all(
          data.data.map(async (item) => {
            const tvdbId = parseInt(item.tvdb_id);
            if (isNaN(tvdbId)) return null;

            const tv = await this.prisma.client.aquilaTv.upsert({
              where: { tvdbId },
              update: {
                titleEnglish: item.translations?.eng || item.name,
                titleRomaji: item.name,
                coverImage: item.image || item.thumbnail,
                status: item.status || null,
              },
              create: {
                tvdbId,
                titleEnglish: item.translations?.eng || item.name,
                titleRomaji: item.name,
                coverImage: item.image || item.thumbnail,
                status: item.status || null,
              },
              select: {
                id: true,
                titleEnglish: true,
                titleRomaji: true,
                coverImage: true,
              },
            });

            this.queueFetch(tvdbId);

            const searchItem: TvSearchEntity = {
              id: tv.id,
              title: tv.titleEnglish || item.translations?.eng || item.name,
              secondaryTitle: tv.titleRomaji || item.name || null,
              coverImage: tv.coverImage || item.image || item.thumbnail || null,
              format: 'TV',
              status: item.status || 'RELEASED',
              isAdult: false,
              averageScore: null,
            };
            return searchItem;
          }),
        )
      ).filter((r): r is TvSearchEntity => r !== null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search TV series in TVDB: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSTS001`, {
        message: 'Failed to search TV series in TVDB',
      });
    }
  }

  private queueFetch(tvdbId: number): void {
    this.fetchAndUpsertTv(tvdbId).catch((err: Error) =>
      this.logger.warn(
        `Background fetch failed for TV series ${tvdbId}: ${err.message}`,
      ),
    );
  }

  private async upsertTv(
    series: TvdbSeriesExtended,
    translation: { name?: string; overview?: string } | null,
    episodes: TvdbEpisode[],
  ): Promise<void> {
    const englishName = translation?.name || series.name;
    const englishOverview = translation?.overview || series.overview || '';

    const artworks = series.artworks || [];
    const bannerArtworks = artworks.filter((a) => a.type === 1 || a.type === 3);
    const bannerImage =
      bannerArtworks.length > 0
        ? bannerArtworks[Math.floor(Math.random() * bannerArtworks.length)]
            .image
        : null;

    const remoteIds = series.remoteIds || [];
    const tmdbIdStr = remoteIds.find((r) => r.type === 10)?.id;
    const imdbId = remoteIds.find((r) => r.type === 2)?.id;

    // Build seasons with episodes
    const seasons =
      series.seasons
        ?.filter((s) => s.type?.id === 1)
        .filter((s) => s.number !== 0)
        .sort((a, b) => a.number - b.number)
        .map((s) => {
          const seasonEpisodes = episodes
            .filter((ep) => ep.seasonNumber === s.number)
            .map((ep) => ({
              id: ep.id,
              number: ep.number,
              name:
                ep.nameTranslations?.find((t) => t.language === 'eng')?.name ||
                ep.name ||
                `Episode ${ep.number}`,
              overview:
                ep.overviewTranslations?.find((t) => t.language === 'eng')
                  ?.overview ||
                ep.overview ||
                null,
              image: ep.image || null,
              airDate: ep.aired || null,
            }))
            .sort((a, b) => a.number - b.number);

          const seasonName =
            s.nameTranslations?.find((t) => t.language === 'eng')?.name ||
            s.name;

          return {
            id: s.id,
            number: s.number,
            name: seasonName || null,
            image: s.image || null,
            episodeCount: seasonEpisodes.length,
            episodes: seasonEpisodes,
          };
        })
        .filter((s) => s.episodes.length > 0) || [];

    const studios =
      series.companies
        ?.filter(
          (co) =>
            co.companyType?.name === 'Network' ||
            co.companyType?.name === 'Production Company',
        )
        .map((s) => s.name) || [];

    const contentRating =
      series.contentRatings?.find((r) => r.country === 'usa')?.name ||
      series.contentRatings?.[0]?.name ||
      null;

    const dbTv = await this.prisma.client.aquilaTv.upsert({
      where: { tvdbId: series.id },
      update: {
        tmdbId: tmdbIdStr ? parseInt(tmdbIdStr) : null,
        imdbId: imdbId || null,
        titleEnglish: englishName,
        titleRomaji: series.name,
        coverImage: series.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: series.slug || null,
        status: series.status?.name || 'RELEASED',
        tvType: series.type?.name || null,
        averageRuntime: series.averageRuntime || null,
        firstAired: series.firstAired || null,
        genres: series.genres?.map((g) => g.name) || [],
        studios,
        tags: Prisma.DbNull as unknown as Prisma.InputJsonValue,
        seasons: seasons as Prisma.InputJsonValue,
        trailers: (series.trailers || []) as Prisma.InputJsonValue,
        originalCountry: series.originalCountry || null,
        originalLanguage: series.originalLanguage || null,
        contentRating,
      },
      create: {
        tvdbId: series.id,
        tmdbId: tmdbIdStr ? parseInt(tmdbIdStr) : null,
        imdbId: imdbId || null,
        titleEnglish: englishName,
        titleRomaji: series.name,
        coverImage: series.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: series.slug || null,
        status: series.status?.name || 'RELEASED',
        tvType: series.type?.name || null,
        averageRuntime: series.averageRuntime || null,
        firstAired: series.firstAired || null,
        genres: series.genres?.map((g) => g.name) || [],
        studios,
        tags: Prisma.DbNull as unknown as Prisma.InputJsonValue,
        seasons: seasons as Prisma.InputJsonValue,
        trailers: (series.trailers || []) as Prisma.InputJsonValue,
        originalCountry: series.originalCountry || null,
        originalLanguage: series.originalLanguage || null,
        contentRating,
      },
      select: { id: true },
    });

    // Upsert actors
    if (series.characters && series.characters.length > 0) {
      for (const char of series.characters) {
        if (!char.peopleId) continue;

        const actor = await this.prisma.client.aquilaActor.upsert({
          where: { peopleId: char.peopleId },
          update: {
            name: char.name || null,
            personName: char.personName || null,
            image: char.image || null,
            peopleType: char.peopleType || null,
          },
          create: {
            peopleId: char.peopleId,
            name: char.name || null,
            personName: char.personName || null,
            image: char.image || null,
            peopleType: char.peopleType || null,
          },
          select: { id: true },
        });

        await this.prisma.client.aquilaTvActor.upsert({
          where: {
            tvId_actorId: {
              tvId: dbTv.id,
              actorId: actor.id,
            },
          },
          update: {},
          create: {
            tvId: dbTv.id,
            actorId: actor.id,
            role: char.name || null,
          },
        });
      }
    }
  }
}
