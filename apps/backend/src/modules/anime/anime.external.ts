import { Injectable, Logger } from '@nestjs/common';
import { AnimeSearchEntity } from './anime.entities';
import { AniListSearchResponse } from './anime.types';
import { rrError } from 'src/providers/error';
import { PrismaService } from 'src/providers/database/prisma.service';

@Injectable()
export class AnimeExternal {
  private readonly logger = new Logger(AnimeExternal.name);
  private readonly moduleCode: string = 'AeExt-';
  constructor(private readonly prisma: PrismaService) {}

  public async search(title: string): Promise<AnimeSearchEntity[]> {
    try {
      this.logger.debug('Searching for anime in AniList');

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: `query ($search: String, $page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media (search: $search, type: ANIME) {
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
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
              season
              seasonYear
              episodes
              duration
              countryOfOrigin
              source
              hashtag
              trailer {
                id
                site
                thumbnail
              }

            coverImage {
              large
            }
              bannerImage

                genres
                synonyms
                averageScore
                tags {
                  name
                  rank
                }
                      relations {
      edges {
        id
        relationType
        node {
          id
          title {
            romaji
          }
          format
          type
        }
      }
    }
         characters (perPage: 10, sort: [ROLE, RELEVANCE, ID]) {
      edges {
        role
        node {
          name {
            full
          }
          image {
            medium
          }
        }
        voiceActors (language: JAPANESE) {
          name {
            full
          }
          image {
            medium
          }
        }
      }
    }
          studios (isMain: true) {
      nodes {
        name
      }
    }
            isAdult
            nextAiringEpisode
            airingSchedule
          }
        }

      }`,
          variables: {
            search: title,
            perPage: 30,
          },
        }),
      });

      const data = ((await res.json()) as AniListSearchResponse).data;

      const localData = await Promise.all(
        data.Page.media.map(async (item) => {
          const anime = await this.prisma.client.aquilaAnime.upsert({
            where: { anilistId: item.id },
            update: {
              anilistId: item.id,
              titleEnglish: item.title.english,
              titleRomaji: item.title.romaji,
              coverImageLarge: item.coverImage?.large,
              averageScore: item.averageScore,
              format: item.format,
              status: item.status,
              isAdult: item.isAdult,
            },
            create: {
              anilistId: item.id,
              titleEnglish: item.title.english,
              titleRomaji: item.title.romaji,
              coverImageLarge: item.coverImage?.large,
              averageScore: item.averageScore,
              format: item.format,
              status: item.status,
              isAdult: item.isAdult,
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
          return {
            id: anime.id,
            title: anime.titleEnglish ?? 'Unknown',
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
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFA001`, {
        message: 'Failed to fetch anime from AniList',
      });
    }
  }
}
