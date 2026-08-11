import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { GameSearchEntity } from './game.entities';
import { GameRepository } from './game.repository';
import { WikidataService } from 'src/providers/Wikidata/wikidata.service';
import { IgdbService, IgdbGame } from 'src/providers/Igdb/igdb.service';
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
    private readonly igdbService: IgdbService,
    private readonly steamService: SteamService,
  ) {}

  private parseTimestamp(timestampSec: number | undefined): {
    releasedYear: number | null;
    releasedMonth: number | null;
    releasedDay: number | null;
    releaseDate: Date | null;
  } {
    if (!timestampSec) {
      return {
        releasedYear: null,
        releasedMonth: null,
        releasedDay: null,
        releaseDate: null,
      };
    }

    const d = new Date(timestampSec * 1000);
    const releasedYear = d.getUTCFullYear();
    const releasedMonth = d.getUTCMonth() + 1;
    const releasedDay = d.getUTCDate();
    const releaseDate = new Date(Date.UTC(releasedYear, releasedMonth - 1, releasedDay));

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
      this.logger.debug(`Searching IGDB for games: "${query}"`);
      const results = await this.igdbService.searchGames(query);

      if (!results) {
        throw new rrError(`${this.moduleCode}SRCHF001`, {
          message: 'IGDB search failed',
        });
      }

      const mapped: GameSearchEntity[] = [];

      for (const item of results) {
        const igdbId = item.id;
        const titlePrimary = item.name;
        const coverImage = this.igdbService.formatImageUrl(item.cover?.url, 't_cover_big');
        const { releasedYear } = this.parseTimestamp(item.first_release_date);

        const existing = await this.prisma.client.aquilaGameV2.findUnique({
          where: { igdbId },
          select: { id: true },
        });

        let internalId: number = existing?.id ?? 0;
        if (!internalId) {
          try {
            const created = await this.prisma.client.aquilaGameV2.upsert({
              where: { igdbId },
              create: {
                igdbId,
                titlePrimary,
                coverImage,
                releaseDateYear: releasedYear,
                status: item.first_release_date ? 'RELEASED' : 'ANNOUNCED',
              },
              update: {},
              select: { id: true },
            });
            internalId = created.id;
          } catch (e) {
            const raced = await this.prisma.client.aquilaGameV2.findUnique({
              where: { igdbId },
              select: { id: true },
            });
            internalId = raced?.id ?? igdbId;
          }
        }

        mapped.push({
          id: internalId,
          igdbId,
          title: titlePrimary,
          secondaryTitle: null,
          coverImage,
          format: 'GAME',
          status: item.first_release_date ? 'RELEASED' : 'ANNOUNCED',
          isAdult: false,
          averageScore: null,
          releaseDateYear: releasedYear,
        });
      }

      return mapped;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search games in IGDB: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSG001`, {
        message: 'Failed to search games in IGDB',
      });
    }
  }

  public async fetchFullV2Record(igdbId: number): Promise<any | null> {
    try {
      this.logger.debug(`Fetching full V2 game record for IGDB ID: ${igdbId}`);
      const game: IgdbGame | null = await this.igdbService.fetchGameDetail(igdbId);
      if (!game) return null;

      const released = this.parseTimestamp(game.first_release_date);
      const description = this.cleanHtml(game.summary || game.storyline);

      const genres = (game.genres || []).map((g) => g.name);
      const platforms = (game.platforms || []).map((p) => p.name);

      const developers: string[] = [];
      const publishers: string[] = [];
      if (game.involved_companies && Array.isArray(game.involved_companies)) {
        for (const ic of game.involved_companies) {
          if (ic.company?.name) {
            if (ic.developer) developers.push(ic.company.name);
            if (ic.publisher) publishers.push(ic.company.name);
          }
        }
      }

      const tags = (game.game_modes || []).map((m) => m.name).concat((game.player_perspectives || []).map((p) => p.name));

      const allStudioNames = Array.from(new Set([...developers, ...publishers]));
      const studios = allStudioNames.map((name, index) => ({
        id: index + 1,
        name,
        isMain: index === 0,
      }));

      const staff: any[] = [];
      for (const dev of developers) {
        staff.push({
          namePrimary: dev,
          role: 'OTHER',
          customRole: 'Developer',
        });
      }

      const relations: any[] = [];
      const franchiseName = game.franchise?.name || game.franchises?.[0]?.name || null;
      if (game.similar_games && Array.isArray(game.similar_games)) {
        for (const sim of game.similar_games.slice(0, 10)) {
          relations.push({
            targetType: 'GAME',
            targetIgdbId: sim.id,
            type: 'ALTERNATIVE',
            titlePrimary: sim.name,
            coverImage: this.igdbService.formatImageUrl(sim.cover?.url, 't_cover_big'),
          });
        }
      }

      let tagline: string | null = null;
      if (game.summary) {
        tagline = game.summary.split('.')[0] + '.';
      }

      const trailers: any[] = [];
      if (game.videos && Array.isArray(game.videos)) {
        for (const v of game.videos) {
          trailers.push({
            name: v.name || 'Trailer',
            preview: `https://img.youtube.com/vi/${v.video_id}/hqdefault.jpg`,
            video: `https://www.youtube.com/watch?v=${v.video_id}`,
            site: 'YouTube',
          });
        }
      }

      const coverImage =
        this.igdbService.formatImageUrl(game.cover?.url, 't_1080p') ||
        this.igdbService.formatImageUrl(game.cover?.url, 't_cover_big');
      const bannerImage =
        this.igdbService.formatImageUrl(
          game.artworks?.[0]?.url || game.screenshots?.[0]?.url,
          't_1080p',
        ) || coverImage;

      const screenshots = (game.screenshots || [])
        .map((s) => this.igdbService.formatImageUrl(s.url, 't_1080p'))
        .filter((u): u is string => Boolean(u));
      const artworks = (game.artworks || [])
        .map((a) => this.igdbService.formatImageUrl(a.url, 't_1080p'))
        .filter((u): u is string => Boolean(u));

      const images = {
        cover: coverImage,
        banner: bannerImage,
        screenshots,
        artworks,
      };

      const igdbRating = game.rating
        ? Math.round(game.rating * 10) / 10
        : game.total_rating
          ? Math.round(game.total_rating * 10) / 10
          : null;
      const igdbRatingCount = game.rating_count || game.total_rating_count || null;

      let websiteUrl: string | null = null;
      let steamAppId: number | null = null;

      if (game.websites && Array.isArray(game.websites)) {
        const official = game.websites.find((w) => w.category === 1);
        websiteUrl = official?.url || game.websites[0]?.url || null;

        const steamWeb = game.websites.find(
          (w) => w.category === 13 || (w.url && w.url.includes('steampowered.com/app/')),
        );
        if (steamWeb?.url) {
          const match = steamWeb.url.match(/\/app\/(\d+)/);
          if (match?.[1]) {
            steamAppId = parseInt(match[1], 10);
          }
        }
      }

      // Languages from IGDB
      const igdbLanguages = (game.language_supports || [])
        .map((ls) => ls.language?.name)
        .filter((name): name is string => Boolean(name));

      let requirements: any = null;
      let languages: string[] = Array.from(new Set(igdbLanguages));
      let controllerSupport: string | null = null;
      let achievements: any = null;

      // Fetch Steam details if steamAppId is present
      if (steamAppId) {
        try {
          const steamDetails: any = await this.steamService.fetchAppDetails(steamAppId);
          if (steamDetails) {
            if (steamDetails.pc_requirements || steamDetails.mac_requirements || steamDetails.linux_requirements) {
              requirements = {
                pc: steamDetails.pc_requirements || null,
                mac: steamDetails.mac_requirements || null,
                linux: steamDetails.linux_requirements || null,
              };
            }

            if (steamDetails.supported_languages) {
              const cleanedLangs = String(steamDetails.supported_languages)
                .replace(/<[^>]*>/g, '')
                .replace(/\*/g, '')
                .split(',')
                .map((l) => l.trim())
                .filter(Boolean);
              languages = Array.from(new Set([...languages, ...cleanedLangs]));
            }

            if (steamDetails.controller_support) {
              const cs = String(steamDetails.controller_support).toLowerCase();
              controllerSupport = cs === 'full' ? 'Full Controller Support' : cs === 'partial' ? 'Partial Controller Support' : cs;
            }

            let allAchievements = await this.steamService.fetchAllAchievements(steamAppId);
            const parentAppId = steamDetails.fullgame?.appid ? Number(steamDetails.fullgame.appid) : null;
            if (allAchievements.length === 0 && parentAppId && !isNaN(parentAppId)) {
              this.logger.debug(
                `DLC App ID ${steamAppId} returned 0 achievements, trying parent game App ID ${parentAppId}...`,
              );
              allAchievements = await this.steamService.fetchAllAchievements(parentAppId);
            }

            if (allAchievements.length > 0) {
              achievements = {
                total: allAchievements.length,
                highlighted: allAchievements,
              };
            } else if (steamDetails.achievements) {
              achievements = {
                total: steamDetails.achievements.total || 0,
                highlighted: steamDetails.achievements.highlighted || [],
              };
            }
          }
        } catch (err: any) {
          this.logger.warn(`Failed to fetch Steam details for steamAppId ${steamAppId}: ${err?.message || err}`);
        }
      }

      let characters: any[] = [];
      try {
        characters = await this.wikidataService.fetchGameCharacters(game.name);
      } catch {
        // ignore character fetch errors
      }

      const fieldsProvided = [
        'titlePrimary',
        'coverImage',
        'bannerImage',
        'description',
        'releaseDateYear',
        'releaseDateMonth',
        'releaseDateDay',
        'releaseDate',
        'genres',
        'platforms',
        'developers',
        'publishers',
        'gameModes',
        'playerPerspectives',
        'status',
        'igdbRating',
        'igdbRatingCount',
        'website',
        'trailers',
        'studios',
        'staff',
        'requirements',
        'languages',
        'controllerSupport',
        'achievements',
      ];

      const sources = [
        {
          provider: 'IGDB',
          externalId: String(game.id),
          url: `https://www.igdb.com/games/${game.slug || game.id}`,
          fieldsProvided,
          fetchedAt: new Date().toISOString(),
        },
      ];

      return {
        igdbId: game.id,
        steamAppId,
        titlePrimary: game.name,
        titleSecondary: null,
        titleNative: null,
        slug: game.slug || null,
        tagline,

        coverImage,
        bannerImage,
        backgroundImage: bannerImage,
        images,

        description,
        originalLanguage: null,
        countryOfOrigin: null,
        website: websiteUrl,
        siteUrl: `https://www.igdb.com/games/${game.slug || game.id}`,

        releaseDateYear: released.releasedYear,
        releaseDateMonth: released.releasedMonth,
        releaseDateDay: released.releasedDay,
        releaseDate: released.releaseDate,

        genres,
        tags,
        platforms,
        developers,
        publishers,
        franchise: franchiseName,
        gameModes: (game.game_modes || []).map((m) => m.name),
        playerPerspectives: (game.player_perspectives || []).map((p) => p.name),
        status: game.first_release_date ? 'RELEASED' : 'ANNOUNCED',
        isAdult: false,
        synonyms: [],
        trailers: trailers.length > 0 ? trailers : null,

        requirements,
        languages,
        controllerSupport,
        achievements,

        averageScore: null,
        metacriticScore: null,
        metacriticUserScore: null,
        igdbRating,
        igdbRatingCount,

        hltbMainStory: null,
        hltbExtraStory: null,
        hltbCompletionist: null,

        sources,
        esrbRating: null,
        pegiRating: null,
        ageRating: null,
        ageRatingGuide: null,
        contentRatings: null,

        characters,
        studios,
        staff,
        relations,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch full V2 game record for IGDB ID ${igdbId}: ${message}`);
      return null;
    }
  }

  public async fetchAndUpsertGame(
    igdbIdOrExtId: number,
    force = false,
  ): Promise<void> {
    await this.resolveAndUpsertGame({ id: igdbIdOrExtId }, force);
  }

  public async resolveAndUpsertGame(
    target: {
      id?: number;
      igdbId?: number | null;
      steamAppId?: number | null;
      giantbombId?: string | null;
      titlePrimary?: string | null;
      slug?: string | null;
      rawgId?: number | null;
    },
    force = false,
  ): Promise<void> {
    let igdbId: number | null = target.igdbId ?? null;
    let targetInternalId: number | undefined = target.id;

    const existing = await this.prisma.client.aquilaGameV2.findFirst({
      where: {
        OR: [
          ...(target.id ? [{ id: target.id }] : []),
          ...(target.igdbId ? [{ igdbId: target.igdbId }] : []),
          ...(target.rawgId ? [{ rawgId: target.rawgId }] : []),
        ],
      },
      select: {
        id: true,
        igdbId: true,
        steamAppId: true,
        giantbombId: true,
        titlePrimary: true,
        slug: true,
        rawgId: true,
      },
    });

    if (existing) {
      targetInternalId = existing.id;
      if (existing.igdbId) {
        igdbId = existing.igdbId;
      }
    }

    if (!igdbId) {
      const steamAppId = target.steamAppId ?? existing?.steamAppId;
      const giantbombId = target.giantbombId ?? existing?.giantbombId;
      const titlePrimary = target.titlePrimary ?? existing?.titlePrimary;
      const slug = target.slug ?? existing?.slug;

      if (steamAppId) {
        this.logger.debug(`Resolving IGDB ID via Steam App ID mapping: ${steamAppId}`);
        igdbId = await this.igdbService.findIgdbIdByExternalId(steamAppId, 1);
      }
      if (!igdbId && giantbombId) {
        this.logger.debug(`Resolving IGDB ID via GiantBomb ID mapping: ${giantbombId}`);
        igdbId = await this.igdbService.findIgdbIdByExternalId(giantbombId, 14);
      }
      if (!igdbId && titlePrimary) {
        this.logger.debug(`Resolving IGDB ID via title/slug: "${titlePrimary}" (slug: ${slug ?? 'none'})`);
        igdbId = await this.igdbService.findIgdbIdByTitleOrSlug(
          titlePrimary,
          slug ?? undefined,
        );
      }
    }

    if (!igdbId && target.id) {
      igdbId = target.id;
    }

    if (!igdbId) {
      this.logger.warn(`Could not resolve IGDB ID for game target: ${JSON.stringify(target)}`);
      return;
    }

    this.logger.debug(`Fetching full V2 game record for IGDB ID ${igdbId} (target internal ID: ${targetInternalId ?? 'new'})`);
    const fullRecord = await this.fetchFullV2Record(igdbId);
    if (fullRecord) {
      if (existing?.rawgId) {
        fullRecord.rawgId = existing.rawgId;
      }
      await this.gameRepository.upsertV2Record(fullRecord, targetInternalId);
    }
  }
}
