import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { Media, SearchMedia } from '../../common/types/types';

@Injectable()
export class MangaService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(MangaService.name);

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
    media (search: $search, type: MANGA) {
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

  public async getManga(id: number): Promise<Media> {
    const aniListRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: `query ($id: Int) {
  Media (id: $id, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    # Visuals
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    # Metadata
    format # e.g., MANGA, ONE_SHOT, NOVEL
    status # e.g., FINISHED, RELEASING, CANCELLED
    description
    chapters
    volumes
    countryOfOrigin
    source
    # Dates
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
    # Stats
    averageScore
    meanScore
    popularity
    favourites
    # Categories
    genres
    tags {
      name
      rank
      isMediaSpoiler
    }
    # Staff (Authors and Illustrators)
    staff (perPage: 5) {
      edges {
        role # e.g., "Story & Art"
        node {
          id
          name {
            full
          }
        }
      }
    }
    # Relationships (Anime adaptations, sequels)
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
          }
          type # Useful to see if the relation is ANIME or MANGA
          format
        }
      }
    }
    # External Links (Official sites, retailers)
    externalLinks {
      id
      url
      site
    }
  }
}`,
        variables: {
          id: id,
        },
      }),
    });

    const data: AniListGetResponse = await aniListRes.json();
    const media = data.data.Media;

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
      chapters: media.chapters,
      volumes: media.volumes,
      genres: media.genres,
      source: media.source,
      tags: media.tags?.map((tag) => ({
        id: tag.name, // Manga tags don't have IDs in the current query, using name
        name: tag.name,
        rank: tag.rank,
      })),
      averageScore: media.averageScore,
      popularity: media.popularity,
      favourites: media.favourites,
      relations: media.relations?.edges.map((edge) => ({
        id: edge.node.id.toString(),
        relationType: edge.relationType,
        title: { romaji: edge.node.title.romaji },
        format: edge.node.format,
        type: edge.node.type,
      })),
      externalLinks: media.externalLinks,
      trailers: [],
      staff: media.staff?.edges.map((edge) => ({
        id: edge.node.id.toString(),
        name: edge.node.name.full,
        role: edge.role,
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
      chapters: number;
      volumes: number;
      countryOfOrigin: string;
      source: string;
      averageScore: number;
      meanScore: number;
      popularity: number;
      favourites: number;
      genres: string[];
      tags: {
        name: string;
        rank: number;
        isMediaSpoiler: boolean;
      }[];
      staff: {
        edges: {
          role: string;
          node: {
            id: number;
            name: {
              full: string;
            };
          };
        }[];
      };
      relations: {
        edges: {
          relationType: string;
          node: {
            id: number;
            title: {
              romaji: string;
            };
            type: string;
            format: string;
          };
        }[];
      };
      externalLinks: {
        id: string;
        url: string;
        site: string;
      }[];
    };
  };
}
