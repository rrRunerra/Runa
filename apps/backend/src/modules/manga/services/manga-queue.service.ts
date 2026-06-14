import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MangaRepository } from '../repositories/manga.repository';

@Injectable()
export class MangaQueueService implements OnModuleInit {
  private readonly logger = new Logger(MangaQueueService.name);
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly mangaRepository: MangaRepository) {}

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
            this.logger.log(`Processing sync job for manga ${anilistId}`);
            await this.syncMangaFromAniList(anilistId);
            this.logger.log(`Completed sync job for manga ${anilistId}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync manga ${anilistId}: ${message}`);
          } finally {
            this.processing.delete(anilistId);
          }
        }, 1),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncMangaFromAniList(anilistId: number) {
    const manga = await this.fetchFromAniList(anilistId);
    if (manga) {
      await this.mangaRepository.upsert(anilistId, manga);
    }
  }

  private async fetchFromAniList(anilistId: number): Promise<any | null> {
    const query = `query ($id: Int) {
      Media (id: $id, type: MANGA) {
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
        chapters
        volumes
        source
        averageScore
        meanScore
        popularity
        trending
        favourites
        genres
        synonyms
        hashtag
        countryOfOrigin
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
    }`;

    let aniListRes: Response | null = null;
    const maxRetries = 5;
    const baseDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Proactively delay to stay under the 90 req/min limit
        await new Promise((resolve) => setTimeout(resolve, 750));

        aniListRes = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { id: anilistId },
          }),
        });

        if (aniListRes.status === 429) {
          const retryAfter = aniListRes.headers.get('retry-after');
          const waitTime = retryAfter
            ? parseInt(retryAfter, 10) * 1000 + 1000
            : baseDelay * Math.pow(2, i);
          this.logger.warn(`AniList rate limit hit (429) for manga ${anilistId}. Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        break;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        const waitTime = baseDelay * Math.pow(2, i);
        this.logger.warn(`Network error fetching manga ${anilistId}: ${err}. Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    if (!aniListRes) {
      throw new Error('Failed to fetch from AniList: No response received');
    }

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
      chapters: media.chapters,
      volumes: media.volumes,
      source: media.source,
      genres: media.genres,
      tags: media.tags?.map((tag) => ({ name: tag.name, rank: tag.rank })),
      format: media.format,
      status: media.status,
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
      averageScore: media.averageScore,
      popularity: media.popularity,
      favourites: media.favourites,
      trending: media.trending,
      meanScore: media.meanScore,
      synonyms: media.synonyms || [],
      hashtag: media.hashtag,
      countryOfOrigin: media.countryOfOrigin,
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
      chapters: number;
      volumes: number;
      source: string;
      averageScore: number;
      meanScore: number;
      popularity: number;
      trending: number;
      favourites: number;
      genres: string[];
      synonyms: string[];
      hashtag: string;
      countryOfOrigin: string;
      tags: { name: string; rank: number }[];
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
