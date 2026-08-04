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

      const coverImage = this.igdbService.formatImageUrl(game.cover?.url, 't_cover_big');
      const bannerImage = this.igdbService.formatImageUrl(game.artworks?.[0]?.url || game.screenshots?.[0]?.url, 't_1080p') || coverImage;

      const screenshots = (game.screenshots || []).map((s) => this.igdbService.formatImageUrl(s.url, 't_1080p')).filter(Boolean);
      const artworks = (game.artworks || []).map((a) => this.igdbService.formatImageUrl(a.url, 't_1080p')).filter(Boolean);

      const images = {
        cover: coverImage,
        banner: bannerImage,
        screenshots,
        artworks,
      };

      const igdbRating = game.rating ? Math.round(game.rating * 10) / 10 : game.total_rating ? Math.round(game.total_rating * 10) / 10 : null;
      const igdbRatingCount = game.rating_count || game.total_rating_count || null;

      let websiteUrl: string | null = null;
      if (game.websites && Array.isArray(game.websites)) {
        const official = game.websites.find((w) => w.category === 1);
        websiteUrl = official?.url || game.websites[0]?.url || null;
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
    igdbId: number,
    force = false,
  ): Promise<void> {
    const fullRecord = await this.fetchFullV2Record(igdbId);
    if (fullRecord) {
      await this.gameRepository.upsertV2Record(fullRecord);
    }
  }
}
