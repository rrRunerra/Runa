import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
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
        }, 1),
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
    const query = `query ($id: Int) {
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
        averageScore
        meanScore
        popularity
        trending
        favourites
        genres
        synonyms
        hashtag
        countryOfOrigin
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
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
        trailer {
          id
          site
          thumbnail
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
          this.logger.warn(`AniList rate limit hit (429) for anime ${anilistId}. Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        break;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        const waitTime = baseDelay * Math.pow(2, i);
        this.logger.warn(`Network error fetching anime ${anilistId}: ${err}. Retrying in ${waitTime}ms...`);
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

    const trailers = media.trailer
      ? [
          {
            id: media.trailer.id,
            name: 'Official Trailer',
            site: media.trailer.site,
            url:
              media.trailer.site === 'youtube'
                ? `https://www.youtube.com/watch?v=${media.trailer.id}`
                : media.trailer.id,
          },
        ]
      : [];

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
        voiceActor:
          edge.voiceActors && edge.voiceActors[0]
            ? {
                name: edge.voiceActors[0].name.full,
                image: edge.voiceActors[0].image.medium,
              }
            : null,
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
      nextAiringEpisode: media.nextAiringEpisode || undefined,
      trailers: trailers,
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
      synonyms: string[];
      hashtag: string;
      countryOfOrigin: string;
      averageScore: number;
      meanScore: number;
      popularity: number;
      trending: number;
      favourites: number;
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
          voiceActors: {
            name: {
              full: string;
            };
            image: {
              medium: string;
            };
          }[];
        }[];
      };
      studios: { nodes: { name: string }[] };
      trailer: {
        id: string;
        site: string;
        thumbnail: string;
      };
      nextAiringEpisode: {
        airingAt: number;
        timeUntilAiring: number;
        episode: number;
      };
    };
  };
}
