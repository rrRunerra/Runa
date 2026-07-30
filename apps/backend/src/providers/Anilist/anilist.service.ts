import { Injectable, Logger } from '@nestjs/common';

export interface AniListResponse<T = any> {
  data?: T;
  errors?: any[];
}

@Injectable()
export class AnilistService {
  private readonly logger = new Logger(AnilistService.name);

  /**
   * Primary GraphQL fetch method with retry and rate-limiting support.
   */
  public async fetchGraphQL<T = any>(
    query: string,
    variables: Record<string, any>,
    maxRetries = 5,
    baseDelay = 1000,
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch('https://graphql.anilist.co', {
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
            `AniList rate limit hit (429). Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!res.ok) {
          this.logger.error(`AniList GraphQL HTTP error: ${res.status}`);
          return null;
        }

        const json = (await res.json()) as AniListResponse<T>;
        if (json.errors && json.errors.length > 0) {
          this.logger.warn(
            `AniList GraphQL return errors: ${JSON.stringify(json.errors)}`,
          );
        }
        return json.data ?? null;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.error(
            `AniList request failed after max retries: ${err.message}`,
          );
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  public async fetchFullAnime(searchTermOrId: string | number): Promise<any | null> {
    const isId =
      typeof searchTermOrId === 'number' ||
      (!isNaN(Number(searchTermOrId)) && String(searchTermOrId).trim() !== '');

    const baseQuery = `
      query ${isId ? '($id: Int)' : '($search: String)'} {
        Media(${isId ? 'id: $id' : 'search: $search'}, type: ANIME) {
          id
          idMal
          title { english romaji native }
          coverImage { extraLarge large medium color }
          bannerImage
          description(asHtml: false)
          hashtag
          countryOfOrigin
          episodes
          duration
          startDate { year month day }
          endDate { year month day }
          genres
          synonyms
          source
          format
          status
          season
          seasonYear
          averageScore
          meanScore
          popularity
          favourites
          stats {
            statusDistribution { status amount }
            scoreDistribution { score amount }
          }
          isAdult
          trailer { id site thumbnail }
          siteUrl
          externalLinks { site url icon }
          nextAiringEpisode { episode airingAt }
          updatedAt
          studios {
            edges {
              isMain
              node { id name isAnimationStudio siteUrl favourites }
            }
          }
          relations {
            edges {
              relationType
              node { id type title { english romaji } format }
            }
          }
        }
      }
    `;

    const variables = isId
      ? { id: Number(searchTermOrId) }
      : { search: String(searchTermOrId) };

    const res = await this.fetchGraphQL<{ Media: any }>(baseQuery, variables);
    if (!res?.Media) {
      return null;
    }

    const media = res.Media;
    const mediaId = media.id;

    // Paginate All Characters & Voice Actors across languages
    const allCharacters: any[] = [];
    let charPage = 1;
    let hasMoreChars = true;

    while (hasMoreChars && charPage <= 15) {
      const charQuery = `
        query ($id: Int, $page: Int) {
          Media(id: $id, type: ANIME) {
            characters(page: $page, perPage: 25, sort: [ROLE, RELEVANCE]) {
              pageInfo { hasNextPage }
              edges {
                role
                node {
                  id
                  name { full native alternative alternativeSpoiler }
                  image { large medium }
                  description
                  gender
                  age
                  bloodType
                  dateOfBirth { year month day }
                  favourites
                }
                voiceActors(sort: [RELEVANCE]) {
                  id
                  name { full native alternative }
                  image { large medium }
                  languageV2
                }
              }
            }
          }
        }
      `;
      const charRes = await this.fetchGraphQL<{ Media: { characters: any } }>(
        charQuery,
        { id: mediaId, page: charPage },
      );

      const charData = charRes?.Media?.characters;
      if (charData?.edges) {
        allCharacters.push(...charData.edges);
        hasMoreChars = charData.pageInfo?.hasNextPage || false;
        charPage++;
      } else {
        hasMoreChars = false;
      }
    }

    // Paginate All Staff Members
    const allStaff: any[] = [];
    let staffPage = 1;
    let hasMoreStaff = true;

    while (hasMoreStaff && staffPage <= 15) {
      const staffQuery = `
        query ($id: Int, $page: Int) {
          Media(id: $id, type: ANIME) {
            staff(page: $page, perPage: 25) {
              pageInfo { hasNextPage }
              edges {
                role
                node {
                  id
                  name { full native alternative }
                  image { large medium }
                }
              }
            }
          }
        }
      `;
      const staffRes = await this.fetchGraphQL<{ Media: { staff: any } }>(
        staffQuery,
        { id: mediaId, page: staffPage },
      );

      const staffData = staffRes?.Media?.staff;
      if (staffData?.edges) {
        allStaff.push(...staffData.edges);
        hasMoreStaff = staffData.pageInfo?.hasNextPage || false;
        staffPage++;
      } else {
        hasMoreStaff = false;
      }
    }

    // Paginate All Airing Schedules
    const allAiringSchedule: any[] = [];
    let schedulePage = 1;
    let hasMoreSchedule = true;

    while (hasMoreSchedule && schedulePage <= 15) {
      const scheduleQuery = `
        query ($id: Int, $page: Int) {
          Media(id: $id, type: ANIME) {
            airingSchedule(page: $page, perPage: 50) {
              pageInfo { hasNextPage }
              nodes {
                id
                episode
                airingAt
              }
            }
          }
        }
      `;
      const scheduleRes = await this.fetchGraphQL<{
        Media: { airingSchedule: any };
      }>(scheduleQuery, { id: mediaId, page: schedulePage });

      const scheduleData = scheduleRes?.Media?.airingSchedule;
      if (scheduleData?.nodes) {
        allAiringSchedule.push(...scheduleData.nodes);
        hasMoreSchedule = scheduleData.pageInfo?.hasNextPage || false;
        schedulePage++;
      } else {
        hasMoreSchedule = false;
      }
    }

    return {
      ...media,
      allCharacters,
      allStaff,
      allAiringSchedule,
    };
  }

  public async searchAnime(query: string, perPage = 30): Promise<any[]> {
    const searchQuery = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME) {
            id
            idMal
            title { english romaji native }
            coverImage { extraLarge large medium }
            bannerImage
            format
            status
            description
            startDate { year month day }
            endDate { year month day }
            episodes
            duration
            genres
            synonyms
            averageScore
            favourites
            isAdult
          }
        }
      }
    `;

    const res = await this.fetchGraphQL<{ Page: { media: any[] } }>(
      searchQuery,
      { search: query, perPage },
    );

    return res?.Page?.media || [];
  }

  public async fetchFullManga(searchTermOrId: string | number): Promise<any | null> {
    const isId =
      typeof searchTermOrId === 'number' ||
      (!isNaN(Number(searchTermOrId)) && String(searchTermOrId).trim() !== '');

    const baseQuery = `
      query ${isId ? '($id: Int)' : '($search: String)'} {
        Media(${isId ? 'id: $id' : 'search: $search'}, type: MANGA) {
          id
          idMal
          title { english romaji native }
          coverImage { extraLarge large medium color }
          bannerImage
          description(asHtml: false)
          hashtag
          countryOfOrigin
          chapters
          volumes
          startDate { year month day }
          endDate { year month day }
          genres
          synonyms
          source
          format
          status
          averageScore
          meanScore
          popularity
          favourites
          stats {
            statusDistribution { status amount }
            scoreDistribution { score amount }
          }
          isAdult
          siteUrl
          externalLinks { site url icon }
          updatedAt
          studios {
            edges {
              isMain
              node { id name isAnimationStudio siteUrl favourites }
            }
          }
          relations {
            edges {
              relationType
              node { id type title { english romaji native } format }
            }
          }
        }
      }
    `;

    const variables = isId
      ? { id: Number(searchTermOrId) }
      : { search: String(searchTermOrId) };

    const res = await this.fetchGraphQL<{ Media: any }>(baseQuery, variables);
    if (!res?.Media) {
      return null;
    }

    const media = res.Media;
    const mediaId = media.id;

    // Paginate All Characters
    const allCharacters: any[] = [];
    let charPage = 1;
    let hasMoreChars = true;

    while (hasMoreChars && charPage <= 15) {
      const charQuery = `
        query ($id: Int, $page: Int) {
          Media(id: $id, type: MANGA) {
            characters(page: $page, perPage: 25, sort: [ROLE, RELEVANCE]) {
              pageInfo { hasNextPage }
              edges {
                role
                node {
                  id
                  name { full native alternative alternativeSpoiler }
                  image { large medium }
                  description
                  gender
                  age
                  bloodType
                  dateOfBirth { year month day }
                  favourites
                }
              }
            }
          }
        }
      `;
      const charRes = await this.fetchGraphQL<{ Media: { characters: any } }>(
        charQuery,
        { id: mediaId, page: charPage },
      );

      const charData = charRes?.Media?.characters;
      if (charData?.edges) {
        allCharacters.push(...charData.edges);
        hasMoreChars = charData.pageInfo?.hasNextPage || false;
        charPage++;
      } else {
        hasMoreChars = false;
      }
    }

    // Paginate All Staff Members (Authors/Artists)
    const allStaff: any[] = [];
    let staffPage = 1;
    let hasMoreStaff = true;

    while (hasMoreStaff && staffPage <= 15) {
      const staffQuery = `
        query ($id: Int, $page: Int) {
          Media(id: $id, type: MANGA) {
            staff(page: $page, perPage: 25) {
              pageInfo { hasNextPage }
              edges {
                role
                node {
                  id
                  name { full native alternative }
                  image { large medium }
                }
              }
            }
          }
        }
      `;
      const staffRes = await this.fetchGraphQL<{ Media: { staff: any } }>(
        staffQuery,
        { id: mediaId, page: staffPage },
      );

      const staffData = staffRes?.Media?.staff;
      if (staffData?.edges) {
        allStaff.push(...staffData.edges);
        hasMoreStaff = staffData.pageInfo?.hasNextPage || false;
        staffPage++;
      } else {
        hasMoreStaff = false;
      }
    }

    return {
      ...media,
      allCharacters,
      allStaff,
    };
  }

  public async searchManga(query: string, perPage = 30): Promise<any[]> {
    const searchQuery = `
      query ($search: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: MANGA) {
            id
            idMal
            title { english romaji native }
            coverImage { extraLarge large medium }
            bannerImage
            format
            status
            description
            startDate { year month day }
            endDate { year month day }
            chapters
            volumes
            genres
            synonyms
            averageScore
            favourites
            isAdult
          }
        }
      }
    `;

    const res = await this.fetchGraphQL<{ Page: { media: any[] } }>(
      searchQuery,
      { search: query, perPage },
    );

    return res?.Page?.media || [];
  }
}
