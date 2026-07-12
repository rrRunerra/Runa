import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { MovieSearchEntity } from './movie.entities';
import { Prisma } from '@runa/database';
import type {
  TvdbSearchResponse,
  TvdbMovieResponse,
  TvdbTranslationResponse,
  TvdbMovieExtended,
  TvdbLoginResponse,
} from './movie.types';

@Injectable()
export class MovieExternal {
  private readonly logger = new Logger(MovieExternal.name);
  private readonly moduleCode = 'MoExt-';
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

  public async fetchAndUpsertMovie(tvdbId: number): Promise<void> {
    try {
      const [movieData, transData] = await Promise.all([
        this.tvdbFetch<TvdbMovieResponse>(
          `${this.baseUrl}/movies/${tvdbId}/extended`,
        ),
        this.tvdbFetch<TvdbTranslationResponse>(
          `${this.baseUrl}/movies/${tvdbId}/translations/eng`,
        ),
      ]);

      if (!movieData.data) {
        throw new rrError(`${this.moduleCode}MNF001`, {
          message: `Movie with TVDB ID ${tvdbId} not found`,
        });
      }

      await this.upsertMovie(movieData.data, transData.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch movie ${tvdbId} from TVDB: ${message}`,
      );
      throw new rrError(`${this.moduleCode}FTFFM001`, {
        message: 'Failed to fetch movie from TVDB',
      });
    }
  }

  public async search(query: string): Promise<MovieSearchEntity[]> {
    try {
      this.logger.debug('Searching for movies in TVDB');
      const data = await this.tvdbFetch<TvdbSearchResponse>(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&type=movie&language=eng`,
      );

      if (data.status === 'error' || !data.data) {
        return [];
      }

      const results = await Promise.all(
        data.data.map(async (item) => {
          const tvdbId = parseInt(item.tvdb_id);
          if (isNaN(tvdbId)) return null;

          const movie = await this.prisma.client.aquilaMovie.upsert({
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
              titleNative: true,
              coverImage: true,
            },
          });

          this.queueFetch(tvdbId);

          return {
            id: movie.id,
            title: movie.titleEnglish || item.translations?.eng || item.name,
            secondaryTitle: movie.titleRomaji || item.name || null,
            coverImage:
              movie.coverImage || item.image || item.thumbnail || null,
            format: 'MOVIE',
            status: item.status || 'RELEASED',
            isAdult: false,
            averageScore: null,
          } satisfies MovieSearchEntity;
        }),
      );

      return results.filter((r) => r !== null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search movies in TVDB: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSM001`, {
        message: 'Failed to search movies in TVDB',
      });
    }
  }

  private queueFetch(tvdbId: number): void {
    this.fetchAndUpsertMovie(tvdbId).catch((err: Error) =>
      this.logger.warn(
        `Background fetch failed for movie ${tvdbId}: ${err.message}`,
      ),
    );
  }

  private async upsertMovie(
    movie: TvdbMovieExtended,
    translation: { name?: string; overview?: string } | null,
  ): Promise<void> {
    const existing = await this.prisma.client.aquilaMovie.findUnique({
      where: { tvdbId: movie.id },
      select: { locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Movie with TVDB ID ${movie.id} is locked, skipping upsert`,
      );
      return;
    }

    const englishName = translation?.name || movie.name;
    const englishOverview = translation?.overview || movie.overview || '';

    // Read studios from companies block (TVDB v4)
    const allStudios: string[] = [];
    if (movie.companies) {
      for (const companyList of [
        movie.companies.studio,
        movie.companies.production,
        movie.companies.network,
        movie.companies.distributor,
      ]) {
        for (const company of companyList) {
          if (company.name && !allStudios.includes(company.name)) {
            allStudios.push(company.name);
          }
        }
      }
    }

    const artworks = movie.artworks || [];
    const bannerArtworks = artworks.filter(
      (a) => a.type === 16 || a.type === 15,
    );
    const bannerImage =
      bannerArtworks.length > 0
        ? bannerArtworks[Math.floor(Math.random() * bannerArtworks.length)]
            .image
        : null;

    const remoteIds = movie.remoteIds || [];
    const tmdbIdStr = remoteIds.find((r) => r.type === 10)?.id;
    const imdbId = remoteIds.find((r) => r.type === 2)?.id;

    let releaseDate: string | null = null;
    let startDateYear: number | null = null;
    let startDateMonth: number | null = null;
    let startDateDay: number | null = null;

    // TVDB v4 returns release date in first_release or releases array, not as top-level releaseDate
    const releaseRaw =
      movie.first_release?.date ?? movie.releases?.[0]?.date ?? null;
    if (releaseRaw) {
      releaseDate = releaseRaw;
      const parts = releaseRaw.split('-');
      if (parts.length === 3) {
        startDateYear = parseInt(parts[0]) || null;
        startDateMonth = parseInt(parts[1]) || null;
        startDateDay = parseInt(parts[2]) || null;
      }
    }

    const contentRating =
      movie.contentRatings?.find((r) => r.country === 'usa')?.name ||
      movie.contentRatings?.[0]?.name ||
      null;

    const dbMovie = await this.prisma.client.aquilaMovie.upsert({
      where: { tvdbId: movie.id },
      update: {
        tmdbId: tmdbIdStr ? parseInt(tmdbIdStr) : null,
        titleNative: movie.name || null,
        imdbId: imdbId || null,
        titleEnglish: englishName,
        titleRomaji: movie.name,
        coverImage: movie.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: movie.slug || null,
        releaseDate,
        status: movie.status?.name || 'RELEASED',
        runtime: movie.runtime || null,
        budget: movie.budget ? String(movie.budget) : null,
        boxOffice: movie.boxOffice || null,
        genres: movie.genres?.map((g) => g.name) || [],
        studios: allStudios,
        startDateYear,
        startDateMonth,
        startDateDay,
        trailers: (movie.trailers || []) as Prisma.InputJsonValue,
        originalCountry: movie.originalCountry || null,
        originalLanguage: movie.originalLanguage || null,
        contentRating,
      },
      create: {
        tvdbId: movie.id,
        tmdbId: tmdbIdStr ? parseInt(tmdbIdStr) : null,
        titleNative: movie.name || null,
        imdbId: imdbId || null,
        titleEnglish: englishName,
        titleRomaji: movie.name,
        coverImage: movie.image || null,
        bannerImage: bannerImage || null,
        description: englishOverview || null,
        slug: movie.slug || null,
        releaseDate,
        status: movie.status?.name || 'RELEASED',
        runtime: movie.runtime || null,
        budget: movie.budget ? String(movie.budget) : null,
        boxOffice: movie.boxOffice || null,
        genres: movie.genres?.map((g) => g.name) || [],
        studios: allStudios,
        startDateYear,
        startDateMonth,
        startDateDay,
        trailers: (movie.trailers || []) as unknown as Prisma.InputJsonValue,
        originalCountry: movie.originalCountry || null,
        originalLanguage: movie.originalLanguage || null,
        contentRating,
      },
      select: { id: true },
    });

    // Upsert actors/characters
    if (movie.characters && movie.characters.length > 0) {
      for (const char of movie.characters) {
        if (!char.peopleId) continue;

        // 1. Try to find if this character is already linked to this movie
        const movieChar = await this.prisma.client.aquilaMovieCharacter.findFirst({
          where: {
            movieId: dbMovie.id,
            role: char.name,
          },
          include: { character: true },
        });

        let dbChar;
        if (movieChar) {
          dbChar = movieChar.character;
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

        await this.prisma.client.aquilaMovieCharacter.upsert({
          where: {
            movieId_characterId: {
              movieId: dbMovie.id,
              characterId: dbChar.id,
            },
          },
          update: {
            role: char.name || null,
            order: char.sort || null,
            actorId: actor.id,
          },
          create: {
            movieId: dbMovie.id,
            characterId: dbChar.id,
            role: char.name || null,
            order: char.sort || null,
            actorId: actor.id,
          },
        });
      }
    }
  }

  public async getRemoteIds(
    tvdbId: number,
  ): Promise<{ tmdbId?: number; imdbId?: string } | null> {
    try {
      const data = await this.tvdbFetch<TvdbMovieResponse>(
        `${this.baseUrl}/movies/${tvdbId}/extended`,
      );
      if (!data.data) return null;
      const remoteIds = data.data.remoteIds || [];
      const tmdbVal = remoteIds.find((r) => r.type === 10)?.id;
      const imdbVal = remoteIds.find((r) => r.type === 2)?.id;
      return {
        tmdbId: tmdbVal ? parseInt(tmdbVal) : undefined,
        imdbId: imdbVal || undefined,
      };
    } catch {
      return null;
    }
  }
}
