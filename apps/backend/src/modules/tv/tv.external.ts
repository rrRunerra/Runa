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

  public async fetchAndUpsertTv(
    tvdbId: number,
    force = false,
  ): Promise<void> {
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
        force,
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

            const existing = await this.prisma.client.aquilaTv.findUnique({
              where: { tvdbId },
              select: {
                id: true,
                titleEnglish: true,
                titleRomaji: true,
                coverImage: true,
                locked: true,
              },
            });

            let tv = existing;
            if (!existing?.locked) {
              tv = await this.prisma.client.aquilaTv.upsert({
                where: { tvdbId },
                update: {
                  titleEnglish: item.translations?.eng || item.name,
                  titleRomaji: item.name,
                  titleNative: item.name,
                  coverImage: item.image || item.thumbnail,
                  status: item.status || null,
                },
                create: {
                  tvdbId,
                  titleEnglish: item.translations?.eng || item.name,
                  titleRomaji: item.name,
                  titleNative: item.name,
                  coverImage: item.image || item.thumbnail,
                  status: item.status || null,
                },
                select: {
                  id: true,
                  titleEnglish: true,
                  titleRomaji: true,
                  coverImage: true,
                  locked: true,
                },
              });

              this.queueFetch(tvdbId);
            }

            if (!tv) return null;

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
    force = false,
  ): Promise<void> {
    const existing = await this.prisma.client.aquilaTv.findUnique({
      where: { tvdbId: series.id },
      select: { locked: true },
    });

    if (existing?.locked && !force) {
      this.logger.debug(
        `TV series with TVDB ID ${series.id} is locked, skipping upsert`,
      );
      return;
    }

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
    // TV: TMDB is type 12 (movies use type 10)
    const tmdbIdStr =
      remoteIds.find((r) => r.type === 12)?.id ??
      remoteIds.find((r) => r.type === 10)?.id;
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

    const studios = (series.companies || [])
      .filter(
        (co) =>
          co.companyType?.companyTypeName === 'Network' ||
          co.companyType?.companyTypeName === 'Production Company',
      )
      .map((s) => s.name);

    const contentRating =
      series.contentRatings?.find((r) => r.country === 'usa')?.name ||
      series.contentRatings?.[0]?.name ||
      null;

    // Parse firstAired into startDate components
    let startDateYear: number | null = null;
    let startDateMonth: number | null = null;
    let startDateDay: number | null = null;
    if (series.firstAired) {
      const parts = series.firstAired.split('-');
      if (parts.length === 3) {
        startDateYear = parseInt(parts[0]) || null;
        startDateMonth = parseInt(parts[1]) || null;
        startDateDay = parseInt(parts[2]) || null;
      }
    }
    const dbTv = await this.prisma.client.aquilaTv.upsert({
      where: { tvdbId: series.id },
      update: {
        tmdbId: tmdbIdStr ? parseInt(tmdbIdStr) : null,
        imdbId: imdbId || null,
        titleEnglish: englishName,
        titleRomaji: series.name,
        titleNative: series.name || null,
        coverImage: series.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: series.slug || null,
        status: series.status?.name || 'RELEASED',
        averageRuntime: series.averageRuntime || null,
        firstAired: series.firstAired || null,
        startDateYear,
        startDateMonth,
        startDateDay,
        genres: series.genres?.map((g) => g.name) || [],
        studios,
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
        titleNative: series.name || null,
        coverImage: series.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: series.slug || null,
        status: series.status?.name || 'RELEASED',
        averageRuntime: series.averageRuntime || null,
        firstAired: series.firstAired || null,
        startDateYear,
        startDateMonth,
        startDateDay,
        genres: series.genres?.map((g) => g.name) || [],
        studios,
        seasons: seasons as Prisma.InputJsonValue,
        trailers: (series.trailers || []) as Prisma.InputJsonValue,
        originalCountry: series.originalCountry || null,
        originalLanguage: series.originalLanguage || null,
        contentRating,
      },
      select: { id: true },
    });

    // Upsert actors/characters
    if (series.characters && series.characters.length > 0) {
      for (const char of series.characters) {
        if (!char.peopleId) continue;

        // 1. Try to find if this character is already linked to this TV series
        const tvChar = await this.prisma.client.aquilaTvCharacter.findFirst({
          where: {
            tvId: dbTv.id,
            role: char.name,
          },
          include: { character: true },
        });

        let dbChar;
        if (tvChar) {
          dbChar = tvChar.character;
          await this.prisma.client.aquilaCharacter.update({
            where: { id: dbChar.id },
            data: {
              nameFirst: char.name || null,
              image: dbChar.image || char.image || null,
            },
          });
        } else {
          // Check if character already exists globally by name to avoid duplicate stubs
          const existingChar = await this.prisma.client.aquilaCharacter.findFirst({
            where: {
              nameFirst: char.name,
            },
          });

          if (existingChar) {
            dbChar = existingChar;
            if (!dbChar.image && char.image) {
              await this.prisma.client.aquilaCharacter.update({
                where: { id: dbChar.id },
                data: { image: char.image },
              });
            }
          } else {
            dbChar = await this.prisma.client.aquilaCharacter.create({
              data: {
                nameFirst: char.name || null,
                image: char.image || null,
              },
            });
          }
        }

        const actor = await this.prisma.client.aquilaActor.upsert({
          where: { peopleId: char.peopleId },
          update: {
            name: char.personName || null,
            personName: char.personName || null,
            image: char.image || null,
            peopleType: char.peopleType || null,
          },
          create: {
            peopleId: char.peopleId,
            name: char.personName || null,
            personName: char.personName || null,
            image: char.image || null,
            peopleType: char.peopleType || null,
          },
          select: { id: true },
        });

        await this.prisma.client.aquilaTvCharacter.upsert({
          where: {
            tvId_characterId: {
              tvId: dbTv.id,
              characterId: dbChar.id,
            },
          },
          update: {
            role: char.name || null,
            order: char.sort || null,
            actorId: actor.id,
          },
          create: {
            tvId: dbTv.id,
            characterId: dbChar.id,
            role: char.name || null,
            order: char.sort || null,
            actorId: actor.id,
          },
        });
      }
    }
  }
}
