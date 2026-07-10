import { Injectable, Logger } from '@nestjs/common';
import { AnimeSearchEntity } from './anime.entities';
import {
  AniListMedia,
  AniListCharacterNode,
  AniListStudioNode,
  AniListRelationNode,
} from './anime.types';
import {
  AnimeFormat,
  AnimeStatus,
  MangaFormat,
  MangaStatus,
  Prisma,
} from '@runa/database';
import { rrError } from 'src/providers/error';
import { PrismaService } from 'src/providers/database/prisma.service';

@Injectable()
export class AnimeExternal {
  private readonly logger = new Logger(AnimeExternal.name);
  private readonly moduleCode: string = 'AeExt-';
  constructor(private readonly prisma: PrismaService) {}

  private readonly getQuery = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        format
        status
        description
        startDate { year month day }
        endDate { year month day }
        season
        seasonYear
        episodes
        duration
        countryOfOrigin
        source
        hashtag
        coverImage { large }
        bannerImage
        genres
        synonyms
        averageScore
        favourites
        tags { name rank }
        trailer { id site thumbnail }
        relations {
          edges {
            id
            relationType
            node {
              id
              idMal
              title { romaji english native }
              format
              type
              status
              description
              coverImage { large }
              bannerImage
              startDate { year month day }
              endDate { year month day }
              episodes
              chapters
              volumes
              duration
              countryOfOrigin
              source
              averageScore
              favourites
              genres
              synonyms
              hashtag
              isAdult
              siteUrl
              updatedAt
            }
          }
        }
        characters(perPage: 25, sort: [ROLE, RELEVANCE, ID]) {
          edges {
            role
            node {
              id
              name {
                first
                middle
                last
                full
                native
                alternative
                alternativeSpoiler
              }
              image { large }
              description
              gender
              age
              bloodType
              dateOfBirth { year month day }
            }
            voiceActors(language: JAPANESE) {
              id
              name { full }
              image { large }
            }
          }
        }
        studios {
          edges {
            isMain
            node {
              id
              name
              isAnimationStudio
              siteUrl
            }
          }
        }
        isAdult
        nextAiringEpisode { airingAt timeUntilAiring episode }
        updatedAt
      }
    }
  `;

  private readonly searchQuery = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
          perPage
        }
        media(search: $search, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          format
          status
          description
          startDate { year month day }
          endDate { year month day }
          season
          seasonYear
          episodes
          duration
          countryOfOrigin
          source
          hashtag
          coverImage { large }
          bannerImage
          genres
          synonyms
          averageScore
          favourites
          tags { name rank }
          trailer { id site thumbnail }
          relations {
            edges {
              id
              relationType
              node {
                id
                idMal
                title { romaji english native }
                format
                type
                status
                description
                coverImage { large }
                bannerImage
                startDate { year month day }
                endDate { year month day }
                episodes
                chapters
                volumes
                duration
                countryOfOrigin
                source
                averageScore
                favourites
                genres
                synonyms
                hashtag
                isAdult
                siteUrl
                updatedAt
              }
            }
          }
          characters(perPage: 25, sort: [ROLE, RELEVANCE, ID]) {
            edges {
              role
              node {
                id
                name {
                  first
                  middle
                  last
                  full
                  native
                  alternative
                  alternativeSpoiler
                }
                image { large }
                description
                gender
                age
                bloodType
                dateOfBirth { year month day }
              }
              voiceActors(language: JAPANESE) {
                id
                name { full }
                image { large }
              }
            }
          }
          studios {
            edges {
              isMain
              node {
                id
                name
                isAnimationStudio
                siteUrl
              }
            }
          }
          isAdult
          nextAiringEpisode { airingAt timeUntilAiring episode }
          updatedAt
        }
      }
    }
  `;

  public async fetchAndUpsertAnime(anilistId: number): Promise<void> {
    try {
      const data = (await this.fetchWithRateLimit(this.getQuery, {
        id: anilistId,
      })) as { data: { Media: AniListMedia } };

      if (!data.data?.Media) {
        throw new rrError(`${this.moduleCode}AWAINF001`, {
          message: `Anime with AniList ID ${anilistId} not found`,
        });
      }

      await this.upsertAnime(data.data.Media);
    } catch (error) {
      this.logger.error(
        `Failed to fetch anime ${anilistId} from AniList: ${error}`,
      );
      throw new rrError(`${this.moduleCode}FTFAFA003`, {
        message: 'Failed to fetch anime from AniList',
      });
    }
  }

  public async search(title: string): Promise<AnimeSearchEntity[]> {
    try {
      this.logger.debug('Searching for anime in AniList');

      const data = (await this.fetchWithRateLimit(this.searchQuery, {
        search: title,
        perPage: 30,
      })) as { data: { Page: { media: AniListMedia[] } } };

      const localData = await Promise.all(
        data.data.Page.media.map(async (item) => {
          const anime = await this.upsertAnime(item);

          return {
            id: anime.id,
            title: anime.titleEnglish ?? 'rrUnknown',
            secondaryTitle: anime.titleRomaji ?? null,
            coverImage: anime.coverImageLarge ?? null,
            averageScore: anime.averageScore ?? null,
            isAdult: anime.isAdult ?? false,
            format: anime.format,
            status: anime.status,
          };
        }),
      );

      return localData;
    } catch (error) {
      this.logger.error(`Failed to fetch anime from AniList: ${error}`);
      throw new rrError(`${this.moduleCode}FTFAFA001`, {
        message: 'Failed to fetch anime from AniList',
      });
    }
  }

  /**
   * Fires a GraphQL request to AniList and retries on 429 (rate limited)
   * using the Retry-After header or exponential back-off.
   */
  private async fetchWithRateLimit(
    query: string,
    variables: Record<string, any>,
    maxRetries = 5,
    baseDelay = 1000,
  ): Promise<unknown> {
    let res: Response | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000 + 500
            : baseDelay * Math.pow(2, attempt);
          this.logger.warn(
            `AniList rate limit hit (429). Waiting ${waitMs}ms before retry ${attempt + 1}/${maxRetries}...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!res.ok) {
          throw new rrError(`${this.moduleCode}AAE001`, {
            message: `AniList API error: ${res.status}`,
          });
        }

        return res.json();
      } catch (err: any) {
        if (attempt === maxRetries - 1) throw err;
        const waitMs = baseDelay * Math.pow(2, attempt);
        this.logger.warn(
          `AniList request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitMs}ms: ${err.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    throw new rrError(`${this.moduleCode}FTFAFA002`, {
      message: 'AniList request failed after maximum retries',
    });
  }

  private async upsertAnime(item: AniListMedia) {
    const existing = await this.prisma.client.aquilaAnime.findUnique({
      where: { anilistId: item.id },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Anime with AniList ID ${item.id} is locked, skipping upsert`,
      );
      return existing
    }

    const anime = await this.prisma.client.aquilaAnime.upsert({
      where: { anilistId: item.id },
      update: {
        anilistId: item.id,
        malId: item.idMal,
        titleEnglish: item.title.english,
        titleRomaji: item.title.romaji,
        titleNative: item.title.native,
        coverImageLarge: item.coverImage?.large,
        bannerImage: item.bannerImage,
        description: item.description,
        startDateYear: item.startDate?.year,
        startDateMonth: item.startDate?.month,
        startDateDay: item.startDate?.day,
        endDateYear: item.endDate?.year,
        endDateMonth: item.endDate?.month,
        endDateDay: item.endDate?.day,
        season: item.season,
        seasonYear: item.seasonYear,
        episodes: item.episodes,
        duration: item.duration,
        countryOfOrigin: item.countryOfOrigin,
        source: item.source,
        hashtag: item.hashtag,
        genres: item.genres ?? [],
        synonyms: item.synonyms ?? [],
        averageScore: item.averageScore,
        favourites: item.favourites,
        format: (item.format ?? 'UNKNOWN') as AnimeFormat,
        status: (item.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
        isAdult: item.isAdult ?? false,
        tags: item.tags as Prisma.InputJsonValue,
        trailers: (item.trailer ?? Prisma.DbNull) as Prisma.InputJsonValue,
        nextAiringEpisode: (item.nextAiringEpisode ??
          Prisma.DbNull) as Prisma.InputJsonValue,
        anilistUpdatedAt: item.updatedAt,
        locked: false,
      },
      create: {
        anilistId: item.id,
        malId: item.idMal,
        titleEnglish: item.title.english,
        titleRomaji: item.title.romaji,
        titleNative: item.title.native,
        coverImageLarge: item.coverImage?.large,
        bannerImage: item.bannerImage,
        description: item.description,
        startDateYear: item.startDate?.year,
        startDateMonth: item.startDate?.month,
        startDateDay: item.startDate?.day,
        endDateYear: item.endDate?.year,
        endDateMonth: item.endDate?.month,
        endDateDay: item.endDate?.day,
        season: item.season,
        seasonYear: item.seasonYear,
        episodes: item.episodes,
        duration: item.duration,
        countryOfOrigin: item.countryOfOrigin,
        source: item.source,
        hashtag: item.hashtag,
        genres: item.genres ?? [],
        synonyms: item.synonyms ?? [],
        averageScore: item.averageScore,
        favourites: item.favourites,
        format: (item.format ?? 'UNKNOWN') as AnimeFormat,
        status: (item.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
        isAdult: item.isAdult ?? false,
        tags: item.tags as Prisma.InputJsonValue,
        trailers: (item.trailer ?? Prisma.DbNull) as Prisma.InputJsonValue,
        nextAiringEpisode: (item.nextAiringEpisode ??
          Prisma.DbNull) as Prisma.InputJsonValue,
        anilistUpdatedAt: item.updatedAt,
      },
      select: {
        id: true,
        titleEnglish: true,
        titleRomaji: true,
        coverImageLarge: true,
        averageScore: true,
        format: true,
        status: true,
        isAdult: true,
      },
    });

    // Process characters
    if (item.characters?.edges) {
      for (const edge of item.characters.edges) {
        const character = await this.upsertCharacter(edge.node);

        await this.prisma.client.aquilaAnimeCharacter.upsert({
          where: {
            animeId_characterId: {
              animeId: anime.id,
              characterId: character.id,
            },
          },
          update: { role: edge.role, order: 0 },
          create: {
            animeId: anime.id,
            characterId: character.id,
            role: edge.role,
            order: 0,
          },
        });
      }
    }

    // Process studios
    if (item.studios?.edges) {
      for (const edge of item.studios.edges) {
        const studio = await this.upsertStudio(edge.node);

        await this.prisma.client.aquilaAnimeStudio.upsert({
          where: {
            animeId_studioId: {
              animeId: anime.id,
              studioId: studio.id,
            },
          },
          update: { isMain: edge.isMain },
          create: {
            animeId: anime.id,
            studioId: studio.id,
            isMain: edge.isMain,
          },
        });
      }
    }

    // Process relations
    if (item.relations?.edges) {
      for (const edge of item.relations.edges) {
        const relationNode = edge.node;

        if (relationNode.type === 'ANIME') {
          await this.upsertRelatedAnime(relationNode);
        } else {
          await this.upsertRelatedManga(relationNode);
        }

        // Create the relation join record
        const relatedAnime =
          relationNode.type === 'ANIME'
            ? await this.prisma.client.aquilaAnime.findFirst({
                where: { anilistId: relationNode.id },
              })
            : null;

        const relatedManga =
          relationNode.type === 'MANGA'
            ? await this.prisma.client.aquilaManga.findFirst({
                where: { anilistId: relationNode.id },
              })
            : null;

        const existing = await this.prisma.client.aquilaMediaRelation.findFirst(
          {
            where: {
              animeId: anime.id,
              relatedAnimeId: relatedAnime?.id ?? null,
              relatedMangaId: relatedManga?.id ?? null,
            },
          },
        );

        if (!existing) {
          await this.prisma.client.aquilaMediaRelation.create({
            data: {
              animeId: anime.id,
              relatedAnimeId: relatedAnime?.id ?? null,
              relatedMangaId: relatedManga?.id ?? null,
              relationType: edge.relationType,
            },
          });
        }
      }
    }

    return anime;
  }

  private async upsertCharacter(node: AniListCharacterNode) {
    const character = await this.prisma.client.aquilaCharacter.upsert({
      where: { anilistId: node.id },
      update: {
        nameFirst: node.name.first,
        nameMiddle: node.name.middle,
        nameLast: node.name.last,
        nameNative: node.name.native,
        nameAlternative: node.name.alternative ?? [],
        nameAlternativeSpoiler: node.name.alternativeSpoiler ?? [],
        image: node.image?.large,
        description: node.description,
        gender: node.gender,
        age: node.age,
        bloodType: node.bloodType,
        dateOfBirthYear: node.dateOfBirth?.year,
        dateOfBirthMonth: node.dateOfBirth?.month,
        dateOfBirthDay: node.dateOfBirth?.day,
      },
      create: {
        anilistId: node.id,
        nameFirst: node.name.first,
        nameMiddle: node.name.middle,
        nameLast: node.name.last,
        nameNative: node.name.native,
        nameAlternative: node.name.alternative ?? [],
        nameAlternativeSpoiler: node.name.alternativeSpoiler ?? [],
        image: node.image?.large,
        description: node.description,
        gender: node.gender,
        age: node.age,
        bloodType: node.bloodType,
        dateOfBirthYear: node.dateOfBirth?.year,
        dateOfBirthMonth: node.dateOfBirth?.month,
        dateOfBirthDay: node.dateOfBirth?.day,
      },
    });
    return character;
  }

  private async upsertStudio(node: AniListStudioNode) {
    const studio = await this.prisma.client.aquilaStudio.upsert({
      where: { anilistId: node.id },
      update: {
        name: node.name,
        isAnimationStudio: node.isAnimationStudio,
        siteUrl: node.siteUrl,
      },
      create: {
        anilistId: node.id,
        name: node.name,
        isAnimationStudio: node.isAnimationStudio,
        siteUrl: node.siteUrl,
      },
    });
    return studio;
  }

  private async upsertRelatedAnime(node: AniListRelationNode) {
    await this.prisma.client.aquilaAnime.upsert({
      where: { anilistId: node.id },
      update: {
        anilistId: node.id,
        titleEnglish: node.title?.english,
        titleRomaji: node.title?.romaji,
        titleNative: node.title?.native,
        coverImageLarge: node.coverImage?.large,
        bannerImage: node.bannerImage,
        startDateYear: node.startDate?.year,
        startDateMonth: node.startDate?.month,
        startDateDay: node.startDate?.day,
        endDateYear: node.endDate?.year,
        endDateMonth: node.endDate?.month,
        endDateDay: node.endDate?.day,
        episodes: node.episodes,
        duration: node.duration,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        favourites: node.favourites,
        format: (node.format ?? 'UNKNOWN') as AnimeFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
      },
      create: {
        anilistId: node.id,
        titleEnglish: node.title?.english,
        titleRomaji: node.title?.romaji,
        titleNative: node.title?.native,
        coverImageLarge: node.coverImage?.large,
        bannerImage: node.bannerImage,
        startDateYear: node.startDate?.year,
        startDateMonth: node.startDate?.month,
        startDateDay: node.startDate?.day,
        endDateYear: node.endDate?.year,
        endDateMonth: node.endDate?.month,
        endDateDay: node.endDate?.day,
        episodes: node.episodes,
        duration: node.duration,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        favourites: node.favourites,
        format: (node.format ?? 'UNKNOWN') as AnimeFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
      },
    });
  }

  private async upsertRelatedManga(node: AniListRelationNode) {
    await this.prisma.client.aquilaManga.upsert({
      where: { anilistId: node.id },
      update: {
        anilistId: node.id,
        malId: node.idMal,
        titleEnglish: node.title?.english,
        titleRomaji: node.title?.romaji,
        titleNative: node.title?.native,
        coverImageLarge: node.coverImage?.large,
        bannerImage: node.bannerImage,
        description: node.description,
        startDateYear: node.startDate?.year,
        startDateMonth: node.startDate?.month,
        startDateDay: node.startDate?.day,
        endDateYear: node.endDate?.year,
        endDateMonth: node.endDate?.month,
        endDateDay: node.endDate?.day,
        chapters: node.chapters,
        volumes: node.volumes,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        favourites: node.favourites,
        format: (node.format ?? 'UNKNOWN') as MangaFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as MangaStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
        anilistUpdatedAt: node.updatedAt,
      },
      create: {
        anilistId: node.id,
        malId: node.idMal,
        titleEnglish: node.title?.english,
        titleRomaji: node.title?.romaji,
        titleNative: node.title?.native,
        coverImageLarge: node.coverImage?.large,
        bannerImage: node.bannerImage,
        description: node.description,
        startDateYear: node.startDate?.year,
        startDateMonth: node.startDate?.month,
        startDateDay: node.startDate?.day,
        endDateYear: node.endDate?.year,
        endDateMonth: node.endDate?.month,
        endDateDay: node.endDate?.day,
        chapters: node.chapters,
        volumes: node.volumes,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        favourites: node.favourites,
        format: (node.format ?? 'UNKNOWN') as MangaFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as MangaStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
        anilistUpdatedAt: node.updatedAt,
      },
    });
  }
}
