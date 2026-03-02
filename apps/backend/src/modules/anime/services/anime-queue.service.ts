import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY, Observable } from 'rxjs';
import { mergeMap, catchError, tap, finalize } from 'rxjs/operators';
import { AnimeRepository } from '../repositories/anime.repository';

@Injectable()
export class AnimeQueueService implements OnModuleInit {
  private readonly logger = new Logger(AnimeQueueService.name);
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly animeRepository: AnimeRepository) {}

  onModuleInit() {
    this.processQueue();
  }

  addJob(anilistId: number) {
    if (!this.processing.has(anilistId)) {
      this.jobQueue.next(anilistId);
    }
  }

  private processQueue() {
    this.jobQueue
      .pipe(
        mergeMap(async (anilistId) => {
          if (this.processing.has(anilistId)) {
            return;
          }

          this.processing.add(anilistId);

          try {
            this.logger.log(`Processing sync job for anime ${anilistId}`);
            await this.syncAnimeFromAniList(anilistId);
            this.logger.log(`Completed sync job for anime ${anilistId}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync anime ${anilistId}: ${message}`);
          } finally {
            this.processing.delete(anilistId);
          }
        }, 3),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncAnimeFromAniList(anilistId: number) {
    const anime = await this.fetchFromAniList(anilistId);
    if (anime) {
      await this.animeRepository.upsert(anilistId, anime);
    }
  }

  private async fetchFromAniList(anilistId: number): Promise<any | null> {
    const aniListRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: `query ($id: Int) {
          Media (id: $id, type: ANIME) {
            id
            idMal
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            bannerImage
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
            source
            genres
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
              }
            }
            studios (isMain: true) {
              nodes {
                name
              }
            }
          }
        }`,
        variables: { id: anilistId },
      }),
    });

    if (!aniListRes.ok) {
      throw new Error(`AniList API error: ${aniListRes.status}`);
    }

    const data: AniListGetResponse = await aniListRes.json();
    const media = data.data?.Media;

    if (!media) {
      return null;
    }

    return {
      anilistId: media.id,
      malId: media.idMal,
      titleEnglish: media.title.english,
      titleRomaji: media.title.romaji,
      titleNative: media.title.native,
      coverImageLarge: media.coverImage.large,
      coverImageExtraLarge: media.coverImage.extraLarge,
      bannerImage: media.bannerImage,
      description: media.description,
      startDateYear: media.startDate?.year,
      startDateMonth: media.startDate?.month,
      startDateDay: media.startDate?.day,
      endDateYear: media.endDate?.year,
      endDateMonth: media.endDate?.month,
      endDateDay: media.endDate?.day,
      season: media.season,
      seasonYear: media.seasonYear,
      episodes: media.episodes,
      duration: media.duration,
      source: media.source,
      genres: media.genres,
      tags: media.tags?.map((tag) => ({ name: tag.name, rank: tag.rank })),
      format: media.format,
      status: media.status,
      isAdult: media.isAdult,
      relations: media.relations?.edges.map((edge) => ({
        id: edge.node.id.toString(),
        relationType: edge.relationType,
        title: { romaji: edge.node.title.romaji },
        format: edge.node.format,
        type: edge.node.type,
      })),
      characters: media.characters?.edges.map((edge) => ({
        name: edge.node.name.full,
        image: edge.node.image.medium,
        role: edge.role,
      })),
      studios: media.studios?.nodes.map((node) => node.name),
    };
  }
}

interface AniListGetResponse {
  data: {
    Media: {
      id: number;
      idMal: number;
      title: { romaji: string; english: string; native: string };
      coverImage: { extraLarge: string; large: string };
      bannerImage: string;
      format: string;
      status: string;
      description: string;
      startDate: { year: number; month: number; day: number };
      endDate: { year: number; month: number; day: number };
      season: string;
      seasonYear: number;
      episodes: number;
      duration: number;
      source: string;
      genres: string[];
      tags: { name: string; rank: number }[];
      isAdult: boolean;
      relations: {
        edges: {
          id: string;
          relationType: string;
          node: {
            id: number;
            title: { romaji: string };
            format: string;
            type: string;
          };
        }[];
      };
      characters: {
        edges: {
          id: string;
          role: string;
          node: {
            id: number;
            name: { full: string };
            image: { medium: string };
          };
        }[];
      };
      studios: { nodes: { name: string }[] };
    };
  };
}
