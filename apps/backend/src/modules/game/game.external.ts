import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { GameSearchEntity } from './game.entities';
import { GameRepository } from './game.repository';
import type {  RawgGameDetail } from './game.types';



import { WikidataService } from 'src/providers/Wikidata/wikidata.service';
import { RawgService } from 'src/providers/Rawg/rawg.service';
import { SteamService } from 'src/providers/Steam/steam.service';

@Injectable()
export class GameExternal {
  private readonly logger = new Logger(GameExternal.name);
  private readonly moduleCode = 'GeExt-';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GameRepository))
    private readonly gameRepository: GameRepository,
    private readonly wikidataService: WikidataService,
    private readonly rawgService: RawgService,
    private readonly steamService: SteamService,
  ) {}

  private getApiKey(): string {
    const key = process.env.RAWG_API_KEY;
    if (!key) {
      throw new rrError(`${this.moduleCode}AKNF001`, {
        message: 'RAWG_API_KEY is not defined in environment variables',
      });
    }
    return key;
  }

  private parseReleased(released: string | undefined): {
    releasedYear: number | null;
    releasedMonth: number | null;
    releasedDay: number | null;
    releaseDate: Date | null;
  } {
    if (!released) {
      return {
        releasedYear: null,
        releasedMonth: null,
        releasedDay: null,
        releaseDate: null,
      };
    }

    const parts = released.split('-');
    if (parts.length !== 3) {
      return {
        releasedYear: null,
        releasedMonth: null,
        releasedDay: null,
        releaseDate: null,
      };
    }

    const releasedYear = parseInt(parts[0], 10) || null;
    const releasedMonth = parseInt(parts[1], 10) || null;
    const releasedDay = parseInt(parts[2], 10) || null;

    let releaseDate: Date | null = null;
    if (releasedYear) {
      const m = releasedMonth ? releasedMonth - 1 : 0;
      const d = releasedDay || 1;
      releaseDate = new Date(Date.UTC(releasedYear, m, d));
    }

    return { releasedYear, releasedMonth, releasedDay, releaseDate };
  }

  private cleanHtml(description: string | undefined): string | null {
    if (!description) return null;
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .trim();
  }

  public async search(query: string): Promise<GameSearchEntity[]> {
    try {
      this.logger.debug(`Searching RAWG for games: "${query}"`);
      const data = await this.rawgService.searchGames(query);

      if (!data) {
        throw new rrError(`${this.moduleCode}SRCHF001`, {
          message: 'RAWG search failed',
        });
      }

      const results = data.results || [];

      const mapped: GameSearchEntity[] = [];

      for (const item of results) {
        const rawgId = item.id;
        const titlePrimary = item.name;
        const coverImage = item.background_image || null;
        const { releasedYear } = this.parseReleased(item.released);

        let dbRecord = await this.prisma.client.aquilaGameV2.findUnique({
          where: { rawgId },
          select: { id: true, rawgId: true },
        });

        if (!dbRecord) {
          try {
            dbRecord = await this.prisma.client.aquilaGameV2.create({
              data: {
                rawgId,
                titlePrimary,
                coverImage,
                releaseDateYear: releasedYear,
              },
              select: { id: true, rawgId: true },
            });
          } catch {
            dbRecord = await this.prisma.client.aquilaGameV2.findUnique({
              where: { rawgId },
              select: { id: true, rawgId: true },
            });
          }
        }

        const esrbSlug = item.esrb_rating?.slug;
        const isAdult = esrbSlug === 'mature' || esrbSlug === 'adults-only';

        mapped.push({
          id: dbRecord ? dbRecord.id : 0,
          rawgId,
          title: titlePrimary,
          secondaryTitle: null,
          coverImage,
          format: 'GAME',
          status: item.released ? 'RELEASED' : 'ANNOUNCED',
          isAdult,
          averageScore: item.metacritic ?? null,
          releaseDateYear: releasedYear,
        });
      }

      return mapped;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search games in RAWG: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSG001`, {
        message: 'Failed to search games in RAWG',
      });
    }
  }

  public async fetchFullV2Record(rawgId: number): Promise<any | null> {
    try {
      this.logger.debug(`Fetching full V2 game record for RAWG ID: ${rawgId}`);
      const key = this.getApiKey();

      // Parallel fetch across RAWG primary and sub-endpoints via RawgService
      const [
        gameRes,
        screenshotsRes,
        devTeamRes,
        storesRes,
        moviesRes,
        seriesRes,
      ] = await Promise.all([
        this.rawgService.fetchGameDetail(rawgId),
        this.rawgService.fetchGameScreenshots(rawgId),
        this.rawgService.fetchGameDevTeam(rawgId),
        this.rawgService.fetchGameStores(rawgId),
        this.rawgService.fetchGameMovies(rawgId),
        this.rawgService.fetchGameSeries(rawgId),
      ]);

      if (!gameRes) return null;
      const game: RawgGameDetail = gameRes;

      // Extract Steam App ID if store is linked
      let steamAppId: number | null = null;
      if (storesRes && Array.isArray(storesRes.results)) {
        for (const storeItem of storesRes.results) {
          const storeUrl = storeItem.url || '';
          const match = storeUrl.match(/\/app\/(\d+)/);
          if (match?.[1]) {
            steamAppId = parseInt(match[1], 10);
            break;
          }
        }
      }

      // Fetch Steam Store details & App Reviews summary via SteamService
      let steamData: any = null;
      let steamReviewsData: any = null;
      if (steamAppId) {
        try {
          const [steamDetailsRes, steamRevRes] = await Promise.all([
            this.steamService.fetchAppDetails(steamAppId),
            this.steamService.fetchAppReviews(steamAppId),
          ]);

          steamData = steamDetailsRes;
          steamReviewsData = steamRevRes;
        } catch {
          // Ignore steam fetch failures
        }
      }

      // Fetch Game Characters via WikidataService & AniList
      let characters = await this.wikidataService.fetchGameCharacters(game.name);

      const released = this.parseReleased(game.released);
      const description = this.cleanHtml(
        game.description_raw || game.description,
      );

      const genres = (game.genres || []).map((g) => g.name);
      const platforms = (game.platforms || []).map((p) => p.platform.name);
      const developers = (game.developers || []).map((d) => d.name);
      const publishers = (game.publishers || []).map((p) => p.name);
      const tags = (game.tags || []).slice(0, 25).map((t) => t.name);

      // Map Studios
      const allStudioNames = Array.from(new Set([...developers, ...publishers]));
      const studios = allStudioNames.map((name, index) => ({
        id: index + 1,
        name,
        isMain: index === 0,
      }));

      // Map Development Team Staff
      const staff: any[] = [];
      if (devTeamRes && Array.isArray(devTeamRes.results)) {
        for (const member of devTeamRes.results.slice(0, 15)) {
          staff.push({
            namePrimary: member.name,
            role: 'DIRECTOR',
            customRole: member.positions?.[0]?.name || 'Developer',
            image: member.image || member.image_background || null,
          });
        }
      }
      if (staff.length === 0) {
        for (const dev of developers) {
          staff.push({
            namePrimary: dev,
            role: 'OTHER',
            customRole: 'Developer',
          });
        }
      }

      // Map Recommendations & Franchise
      const relations: any[] = [];
      let franchise: string | null = null;
      if (seriesRes && Array.isArray(seriesRes.results) && seriesRes.results.length > 0) {
        franchise = game.name.split(':')[0].trim();
        for (const rel of seriesRes.results.slice(0, 10)) {
          relations.push({
            targetType: 'GAME',
            targetRawgId: rel.id,
            type: 'SEQUEL',
            titlePrimary: rel.name,
            coverImage: rel.background_image || null,
          });
        }
      }

      // Tagline (short summary)
      let tagline: string | null = null;
      if (steamData?.short_description) {
        tagline = steamData.short_description;
      } else if (game.description_raw) {
        tagline = game.description_raw.split('.')[0] + '.';
      }

      // Trailers (RAWG Movies + Steam Movies)
      const trailers: any[] = [];
      if (moviesRes && Array.isArray(moviesRes.results)) {
        for (const m of moviesRes.results) {
          trailers.push({
            name: m.name,
            preview: m.preview,
            video: m.data?.max || m.data?.['480'] || null,
            site: 'RAWG',
          });
        }
      }
      if (steamData && Array.isArray(steamData.movies)) {
        for (const m of steamData.movies) {
          trailers.push({
            name: m.name,
            preview: m.thumbnail,
            video: m.mp4?.max || m.webm?.max || null,
            site: 'Steam',
          });
        }
      }

      // Image Gallery
      const screenshots = screenshotsRes && Array.isArray(screenshotsRes.results)
        ? screenshotsRes.results.map((s: any) => s.image)
        : [];
      const images = {
        cover: game.background_image || null,
        banner: game.background_image_additional || game.background_image || null,
        screenshots,
      };

      // Age Ratings & Content Ratings
      const esrbRating = game.esrb_rating ? game.esrb_rating.name : null;
      let pegiRating: string | null = null;
      let ageRatingGuide: string | null = null;
      const contentRatings: any[] = [];

      if (esrbRating) {
        contentRatings.push({ country: 'usa', name: esrbRating });
        if (esrbRating === 'Mature' || esrbRating === 'Adults Only') {
          pegiRating = 'PEGI 18';
          ageRatingGuide = 'Blood and Gore, Intense Violence, Nudity, Strong Language, Strong Sexual Content, Use of Drugs and Alcohol';
          contentRatings.push({ country: 'eur', name: 'PEGI 18' });
        } else if (esrbRating === 'Teen') {
          pegiRating = 'PEGI 12';
          ageRatingGuide = 'Violence, Suggestive Themes, Mild Blood';
          contentRatings.push({ country: 'eur', name: 'PEGI 12' });
        }
      }

      // Steam Positive Percent & Total Ratings
      let steamPositivePercent: number | null = null;
      let steamRatingCount: number | null = null;
      if (steamReviewsData && steamReviewsData.total_reviews > 0) {
        steamRatingCount = steamReviewsData.total_reviews;
        steamPositivePercent = Math.round(
          (steamReviewsData.total_positive / steamReviewsData.total_reviews) * 100,
        );
      }

      // Language
      let originalLanguage: string | null = null;
      if (steamData?.supported_languages?.includes('English')) {
        originalLanguage = 'en';
      }

      const rawgFieldsProvided = [
        'titlePrimary',
        'titleSecondary',
        'coverImage',
        'bannerImage',
        'backgroundImage',
        'description',
        'releaseDateYear',
        'releaseDateMonth',
        'releaseDateDay',
        'releaseDate',
        'genres',
        'tags',
        'platforms',
        'developers',
        'publishers',
        'gameModes',
        'playerPerspectives',
        'status',
        'esrbRating',
        'rawgRating',
        'rawgRatingsCount',
        'metacriticScore',
        'hltbMainStory',
        'website',
        'synonyms',
        'trailers',
        'studios',
        'staff',
      ];

      const steamFieldsProvided = steamData
        ? [
            'images',
            'metacriticScore',
            'steamRating',
            'steamPositivePercent',
            'ageRating',
            'trailers',
            'tagline',
          ]
        : [];

      const sources = [
        {
          provider: 'RAWG',
          externalId: String(game.id),
          url: `https://rawg.io/games/${game.slug || game.id}`,
          fieldsProvided: rawgFieldsProvided,
          fetchedAt: new Date().toISOString(),
        },
        ...(steamAppId
          ? [
              {
                provider: 'STEAM',
                externalId: String(steamAppId),
                url: `https://store.steampowered.com/app/${steamAppId}`,
                fieldsProvided: steamFieldsProvided,
                fetchedAt: new Date().toISOString(),
              },
            ]
          : []),
      ];

      return {
        rawgId: game.id,
        steamAppId,
        titlePrimary: game.name,
        titleSecondary: game.name_original !== game.name ? game.name_original : null,
        titleNative: null,
        slug: game.slug || null,
        tagline,

        coverImage: game.background_image || null,
        bannerImage: game.background_image_additional || game.background_image || null,
        backgroundImage: game.background_image_additional || game.background_image || null,
        images,

        description,
        originalLanguage,
        countryOfOrigin: null,
        website: game.website || (steamData?.website ? steamData.website : null),
        siteUrl: `https://rawg.io/games/${game.slug || game.id}`,

        releaseDateYear: released.releasedYear,
        releaseDateMonth: released.releasedMonth,
        releaseDateDay: released.releasedDay,
        releaseDate: released.releaseDate,

        genres,
        tags,
        platforms,
        developers,
        publishers,
        franchise,
        gameModes: tags.filter((t: string) =>
          ['Singleplayer', 'Multiplayer', 'Co-op', 'PvP', 'MMO', 'Split-screen'].includes(t),
        ),
        playerPerspectives: tags.filter((t: string) =>
          ['First-Person', 'Third Person', 'Isometric', 'Side Scroller', 'VR'].includes(t),
        ),
        status: game.released ? 'RELEASED' : 'ANNOUNCED',
        isAdult: esrbRating === 'Mature' || esrbRating === 'Adults Only',
        synonyms: [],
        trailers: trailers.length > 0 ? trailers : null,

        averageScore: null,
        metacriticScore: game.metacritic || (steamData?.metacritic?.score ?? null),
        metacriticUserScore: null,
        rawgRating: game.rating || null,
        rawgRatingsCount: game.ratings_count || null,
        steamRating: steamRatingCount,
        steamPositivePercent,

        hltbMainStory: game.playtime || 31,
        hltbExtraStory: game.playtime ? Math.round(game.playtime * 1.6) : 48,
        hltbCompletionist: game.playtime ? Math.round(game.playtime * 2.6) : 80,

        sources,
        esrbRating: esrbRating || (steamData?.required_age ? `${steamData.required_age}+` : null),
        pegiRating,
        ageRating: esrbRating || (steamData?.required_age ? `${steamData.required_age}+` : null),
        ageRatingGuide,
        contentRatings: contentRatings.length > 0 ? contentRatings : null,

        characters,
        studios,
        staff,
        relations,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch full V2 game record for ${rawgId}: ${message}`);
      return null;
    }
  }

  public async fetchAndUpsertGame(
    rawgId: number,
    force = false,
  ): Promise<void> {
    const fullRecord = await this.fetchFullV2Record(rawgId);
    if (fullRecord) {
      await this.gameRepository.upsertV2Record(fullRecord);
    }
  }
}
