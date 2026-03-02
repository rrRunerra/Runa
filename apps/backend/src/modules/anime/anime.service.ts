import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { Media, SearchMedia } from '../../common/types/types';
import { AnimeRepository } from './repositories/anime.repository';
import { AnimeQueueService } from './services/anime-queue.service';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);

  constructor(
    private readonly prisma: PrismaService,
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

    const data: AniListSearchResponse = await aniListRes.json();
    return data.data.Page.media.map((item) => ({
      id: item.id.toString(),
      title: {
        romaji: item.title.romaji,
        english: item.title.english,
      },
      coverImage: {
        large: item.coverImage.large,
      },
      format: item.format,
      status: item.status,
      isAdult: item.isAdult,
    }));
  }

  public async getAnime(id: number): Promise<Media> {
    if (isNaN(id)) {
      throw new Error(`Invalid anime ID: ${id}`);
    }

    const dbAnime = await this.animeRepository.findByAnilistId(id);

    if (dbAnime) {
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
    } catch (error) {
      if (dbAnime) {
        return this.animeRepository.toMedia(dbAnime);
      }
      throw new NotFoundException('Anime not found');
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
      }
    }
    # Studio Information
    studios (isMain: true) {
      nodes {
        name
      }
    }
  }
}`,
        variables: {
          id: id,
        },
      }),
    });

    const data: AniListGetResponse = await aniListRes.json();
    const media = data.data?.Media;

    if (!media) {
      throw new Error(`Anime with ID ${id} not found on AniList`);
    }

    return {
      id: media.id.toString(),
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
      })),
      studios: media.studios?.nodes.map((node) => ({
        name: node.name,
      })),
    };
  }
}

interface AniListSearchResponse {
  data: {
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
        perPage: number;
      };
      media: {
        id: number;
        title: {
          romaji: string;
          english: string;
        };
        coverImage: {
          large: string;
        };
        averageScore: number;
        format: string;
        status: string;
        isAdult: boolean;
      }[];
    };
  };
}

interface AniListGetResponse {
  data: {
    Media: {
      id: number;
      title: {
        romaji: string;
        english: string;
        native: string;
      };
      coverImage: {
        extraLarge: string;
        large: string;
        color: string;
      };
      bannerImage: string;
      format: string;
      status: string;
      description: string;
      startDate: {
        year: number;
        month: number;
        day: number;
      };
      endDate: {
        year: number;
        month: number;
        day: number;
      };
      season: string;
      seasonYear: number;
      episodes: number;
      duration: number;
      chapters: number;
      volumes: number;
      countryOfOrigin: string;
      source: string;
      hashtag: string;
      averageScore: number;
      meanScore: number;
      popularity: number;
      trending: number;
      favourites: number;
      genres: string[];
      synonyms: string[];
      tags: {
        id: number;
        name: string;
        description: string;
        rank: number;
        isGeneralSpoiler: boolean;
      }[];
      relations: {
        edges: {
          id: string;
          relationType: string;
          node: {
            id: number;
            title: {
              romaji: string;
            };
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
            name: {
              full: string;
            };
            image: {
              medium: string;
            };
          };
        }[];
      };
      externalLinks: {
        id: string;
        url: string;
        site: string;
      }[];
      trailer: {
        id: string;
        site: string;
        thumbnail: string;
      };
      studios: {
        nodes: {
          id: number;
          name: string;
          isAnimationStudio: boolean;
        }[];
      };
    };
  };
}
