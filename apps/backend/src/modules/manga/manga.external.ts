import { Injectable, Logger } from '@nestjs/common';
import { MangaSearchEntity } from './manga.entities';
import {
  AniListMangaMedia,
  AniListCharacterNode,
  AniListStudioNode,
  AniListRelationNode,
} from './manga.types';
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
export class MangaExternal {
  private readonly logger = new Logger(MangaExternal.name);
  private readonly moduleCode: string = 'MaExt-';
  constructor(private readonly prisma: PrismaService) {}

  private readonly getQuery = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
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
        chapters
        volumes
        countryOfOrigin
        source
        hashtag
        coverImage { large }
        bannerImage
        genres
        synonyms
        averageScore
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
        characters(page: 1, perPage: 25, sort: [ROLE, RELEVANCE, ID]) {
          pageInfo {
            hasNextPage
          }
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
        siteUrl
        updatedAt
      }
    }
  `;

  private readonly getCharactersQuery = `
    query ($id: Int, $page: Int) {
      Media(id: $id) {
        characters(page: $page, perPage: 25, sort: [ROLE, RELEVANCE, ID]) {
          pageInfo {
            hasNextPage
          }
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
        media(search: $search, type: MANGA) {
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
          chapters
          volumes
          countryOfOrigin
          source
          hashtag
          coverImage { large }
          bannerImage
          genres
          synonyms
          averageScore
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
          siteUrl
          updatedAt
        }
      }
    }
  `;

  public async fetchAndUpsertManga(anilistId: number): Promise<void> {
    try {
      const data = (await this.fetchWithRateLimit(this.getQuery, {
        id: anilistId,
      })) as { data: { Media: AniListMangaMedia } };

      if (!data.data?.Media) {
        throw new rrError(`${this.moduleCode}MWAINF002`, {
          message: `Manga with AniList ID ${anilistId} not found`,
        });
      }

      const media = data.data.Media;

      // Fetch all pages of characters
      if (media.characters?.pageInfo?.hasNextPage) {
        let currentPage = 2;
        let hasNextPage = true;

        while (hasNextPage) {
          const charData = (await this.fetchWithRateLimit(this.getCharactersQuery, {
            id: anilistId,
            page: currentPage,
          })) as {
            data: {
              Media: {
                characters: {
                  pageInfo: { hasNextPage: boolean };
                  edges: any[];
                };
              };
            };
          };

          const newEdges = charData?.data?.Media?.characters?.edges || [];
          if (media.characters.edges) {
            media.characters.edges.push(...newEdges);
          } else {
            media.characters.edges = newEdges;
          }

          hasNextPage =
            charData?.data?.Media?.characters?.pageInfo?.hasNextPage ?? false;
          currentPage++;
        }
      }

      await this.upsertManga(media);
    } catch (error) {
      this.logger.error(
        `Failed to fetch manga ${anilistId} from AniList: ${error}`,
      );
      throw new rrError(`${this.moduleCode}FTFMFA003`, {
        message: 'Failed to fetch manga from AniList',
      });
    }
  }

  public async search(title: string): Promise<MangaSearchEntity[]> {
    try {
      this.logger.debug('Searching for manga in AniList');

      const data = (await this.fetchWithRateLimit(this.searchQuery, {
        search: title,
        perPage: 30,
      })) as { data: { Page: { media: AniListMangaMedia[] } } };

      const localData = await Promise.all(
        data.data.Page.media.map(async (item) => {
          const manga = await this.upsertManga(item);

          return {
            id: manga.id,
            title: manga.titleEnglish ?? 'rrUnknown',
            secondaryTitle: manga.titleRomaji ?? null,
            coverImage: manga.coverImageLarge ?? null,
            averageScore: manga.averageScore ?? null,
            isAdult: manga.isAdult ?? false,
            format: manga.format,
            status: manga.status,
          };
        }),
      );

      return localData;
    } catch (error) {
      this.logger.error(`Failed to fetch manga from AniList: ${error}`);
      throw new rrError(`${this.moduleCode}FTFAFA001`, {
        message: 'Failed to fetch manga from AniList',
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

    throw new rrError(`${this.moduleCode}FTFMFA002`, {
      message: 'AniList request failed after maximum retries',
    });
  }

  private async upsertManga(item: AniListMangaMedia) {
    const existing = await this.prisma.client.aquilaManga.findUnique({
      where: { anilistId: item.id },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Manga with AniList ID ${item.id} is locked, skipping upsert`,
      );
      return existing
    }

    const manga = await this.prisma.client.aquilaManga.upsert({
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
        chapters: item.chapters,
        volumes: item.volumes,
        countryOfOrigin: item.countryOfOrigin,
        source: item.source,
        hashtag: item.hashtag,
        genres: item.genres ?? [],
        synonyms: item.synonyms ?? [],
        averageScore: item.averageScore,
        format: (item.format ?? 'UNKNOWN') as MangaFormat,
        status: (item.status ?? 'NOT_YET_RELEASED') as MangaStatus,
        isAdult: item.isAdult ?? false,
        tags: item.tags as Prisma.InputJsonValue,
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
        chapters: item.chapters,
        volumes: item.volumes,
        countryOfOrigin: item.countryOfOrigin,
        source: item.source,
        hashtag: item.hashtag,
        genres: item.genres ?? [],
        synonyms: item.synonyms ?? [],
        averageScore: item.averageScore,
        format: (item.format ?? 'UNKNOWN') as MangaFormat,
        status: (item.status ?? 'NOT_YET_RELEASED') as MangaStatus,
        isAdult: item.isAdult ?? false,
        tags: item.tags as Prisma.InputJsonValue,
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

        await this.prisma.client.aquilaMangaCharacter.upsert({
          where: {
            mangaId_characterId: {
              mangaId: manga.id,
              characterId: character.id,
            },
          },
          update: { role: edge.role, order: 0 },
          create: {
            mangaId: manga.id,
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

        await this.prisma.client.aquilaMangaStudio.upsert({
          where: {
            mangaId_studioId: {
              mangaId: manga.id,
              studioId: studio.id,
            },
          },
          update: { isMain: edge.isMain },
          create: {
            mangaId: manga.id,
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
              mangaId: manga.id,
              relatedAnimeId: relatedAnime?.id ?? null,
              relatedMangaId: relatedManga?.id ?? null,
            },
          },
        );

        if (!existing) {
          await this.prisma.client.aquilaMediaRelation.create({
            data: {
              mangaId: manga.id,
              relatedAnimeId: relatedAnime?.id ?? null,
              relatedMangaId: relatedManga?.id ?? null,
              relationType: edge.relationType,
            },
          });
        }
      }
    }

    return manga;
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
        episodes: node.episodes,
        duration: node.duration,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        format: (node.format ?? 'UNKNOWN') as AnimeFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
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
        episodes: node.episodes,
        duration: node.duration,
        countryOfOrigin: node.countryOfOrigin,
        source: node.source,
        genres: node.genres ?? [],
        synonyms: node.synonyms ?? [],
        averageScore: node.averageScore,
        format: (node.format ?? 'UNKNOWN') as AnimeFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as AnimeStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
        anilistUpdatedAt: node.updatedAt,
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
        format: (node.format ?? 'UNKNOWN') as MangaFormat,
        status: (node.status ?? 'NOT_YET_RELEASED') as MangaStatus,
        isAdult: node.isAdult ?? false,
        hashtag: node.hashtag,
        anilistUpdatedAt: node.updatedAt,
      },
    });
  }
}
