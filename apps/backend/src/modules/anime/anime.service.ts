import { Injectable, Logger } from '@nestjs/common';
import type {
  Media,
  SearchMedia,
  AniListGetResponse,
  AniListSearchResponse,
} from '../../common/types/types';
import { AnimeRepository } from './repositories/anime.repository';
import { AnimeQueueService } from './services/anime-queue.service';
import { rrError, rrNotFoundException } from 'src/providers/error';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const CACHE_DURATION_MS = isDev ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);
  private readonly moduleCode = 'AeSve-';

  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeQueueService: AnimeQueueService,
  ) {}

  public async search(name: string): Promise<SearchMedia[]> {
    const aniListRes = await fetch('https://graphql.anilist.co', {
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
      title {
        romaji
        english
      }
      coverImage {
        large
      }
      averageScore
      format
      status
      isAdult
    }
  }

}`,
        variables: {
          search: name,
        },
      }),
    });

    const data = (await aniListRes.json()) as AniListSearchResponse;
    return data.data.Page.media.map((item) => ({
      id: item.id.toString(),
      title: {
        romaji: item.title.romaji,
        english: item.title.english ?? '',
      },
      coverImage: {
        large: item.coverImage.large,
      },
      format: item.format,
      status: item.status,
      isAdult: item.isAdult,
    }));
  }

  public async getAnime(id: number, forceRefresh = false): Promise<Media> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const dbAnime = await this.animeRepository.findByAnilistId(id);

    if (dbAnime && !forceRefresh) {
      const now = new Date();
      const updatedAt = new Date(dbAnime.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS) {
        return this.animeRepository.toMedia(dbAnime);
      }
    }

    try {
      const media = await this.fetchFromAniList(id);

      this.animeQueueService.addJob(id);

      return media;
    } catch {
      if (dbAnime) {
        return this.animeRepository.toMedia(dbAnime);
      }
      throw new rrNotFoundException(`${this.moduleCode}ANF001`, {
        message: 'Anime not found',
      });
    }
  }

  private async fetchFromAniList(id: number): Promise<Media> {
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
    # Visuals
    coverImage {
      extraLarge
      large
    }
    bannerImage
    # Metadata
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
    # Stats
    averageScore
    meanScore
    popularity
    trending
    favourites
    # Categories
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
    # Relationships (Sequels, Prequels, etc.)
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
    # Characters (First 10)
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
    # Studio Information
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
}`,
        variables: {
          id: id,
        },
      }),
    });

    const data = (await aniListRes.json()) as AniListGetResponse;
    const media = data.data?.Media;

    if (!media) {
      throw new rrError(`${this.moduleCode}AWINFOA001`, {
        message: `Anime with ID ${id} not found on AniList`,
      });
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
      id: media.id.toString(),
      anilistId: media.id,
      malId: media.idMal,
      title: media.title,
      coverImage: media.coverImage,
      bannerImage: media.bannerImage,
      format: media.format,
      status: media.status,
      description: media.description,
      startDate: media.startDate,
      endDate: media.endDate,
      season: media.season,
      seasonYear: media.seasonYear,
      episodes: media.episodes,
      duration: media.duration,
      genres: media.genres,
      source: media.source,
      tags: media.tags?.map((tag) => ({
        name: tag.name,
        rank: tag.rank,
      })),
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
      studios: media.studios?.nodes.map((node) => ({
        name: node.name,
      })),
      averageScore: media.averageScore,
      popularity: media.popularity,
      favourites: media.favourites,
      trending: media.trending,
      meanScore: media.meanScore,
      synonyms: media.synonyms,
      hashtag: media.hashtag,
      countryOfOrigin: media.countryOfOrigin,
      nextAiringEpisode: media.nextAiringEpisode,
      trailers,
    };
  }

  public async ensureAnime(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    let anime = await this.animeRepository.findByAnilistId(anilistId);
    if (!anime) {
      anime = await this.animeRepository.upsert(anilistId, {
        anilistId,
        malId: malId || null,
        titleRomaji: title || 'Unknown',
        coverImageLarge: coverImage || '',
      });
      this.animeQueueService.addJob(anilistId);
    } else if (malId && !anime.malId) {
      anime = await this.animeRepository.upsert(anilistId, {
        malId,
      });
    }
    return anime;
  }
}
