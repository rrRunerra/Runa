import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateSubmissionDto } from './dto/submission.dto';
import { BitField, AquilaFlags, RunaFlags } from '@runa/permissions';
import { MediaType, CharacterRole, RelationType } from '@runa/database';

const MANAGE_FLAG_MAP: Record<string, bigint> = {
  anime: AquilaFlags.MANAGE_ANIME,
  manga: AquilaFlags.MANAGE_MANGA,
  movie: AquilaFlags.MANAGE_MOVIE,
  tv: AquilaFlags.MANAGE_TV,
  game: AquilaFlags.MANAGE_GAME,
  book: AquilaFlags.MANAGE_BOOK,
};

const MEDIA_TYPE_MAP: Record<string, MediaType> = {
  anime: MediaType.ANIME,
  manga: MediaType.MANGA,
  movie: MediaType.MOVIE,
  tv: MediaType.TV,
  game: MediaType.GAME,
  book: MediaType.BOOK,
  music: MediaType.MUSIC,
};

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  canUserManage(mediaType: string, userPermissions: number[] = []): boolean {
    const bitfield = new BitField(userPermissions);
    if (bitfield.has(RunaFlags.ADMINISTRATOR) || bitfield.has(AquilaFlags.MANAGE)) {
      return true;
    }
    const typeFlag = MANAGE_FLAG_MAP[mediaType.toLowerCase()];
    return typeFlag ? bitfield.has(typeFlag) : false;
  }

  async createSubmission(
    userId: string,
    dto: CreateSubmissionDto,
    userPermissions: number[] = [],
  ) {
    const canBypass = this.canUserManage(dto.mediaType, userPermissions);

    if (canBypass) {
      const mediaId = await this.applyMediaData(dto.mediaType, dto.actionType, dto.mediaId, dto.data);
      const submission = await this.prisma.client.aquilaMediaSubmission.create({
        data: {
          mediaType: dto.mediaType,
          actionType: dto.actionType,
          mediaId: mediaId,
          data: dto.data,
          status: 'APPROVED',
          submittedById: userId,
          reviewedById: userId,
        },
      });
      return { status: 'APPROVED', appliedDirectly: true, submission, mediaId };
    } else {
      const submission = await this.prisma.client.aquilaMediaSubmission.create({
        data: {
          mediaType: dto.mediaType,
          actionType: dto.actionType,
          mediaId: dto.mediaId,
          data: dto.data,
          status: 'PENDING',
          submittedById: userId,
        },
      });
      return { status: 'PENDING', appliedDirectly: false, submission };
    }
  }

  async getPendingSubmissions(mediaType?: string) {
    const where: any = { status: 'PENDING' };
    if (mediaType) {
      where.mediaType = mediaType.toLowerCase();
    }
    return this.prisma.client.aquilaMediaSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async approveSubmission(submissionId: string, reviewerId: string) {
    const submission = await this.prisma.client.aquilaMediaSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.status !== 'PENDING') {
      throw new BadRequestException(`Submission is already ${submission.status}`);
    }

    const appliedMediaId = await this.applyMediaData(
      submission.mediaType,
      submission.actionType,
      submission.mediaId,
      submission.data as Record<string, any>,
    );

    const updated = await this.prisma.client.aquilaMediaSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        mediaId: appliedMediaId,
      },
    });

    return updated;
  }

  async rejectSubmission(submissionId: string, reviewerId: string, rejectionReason?: string) {
    const submission = await this.prisma.client.aquilaMediaSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.status !== 'PENDING') {
      throw new BadRequestException(`Submission is already ${submission.status}`);
    }

    const updated = await this.prisma.client.aquilaMediaSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        rejectionReason: rejectionReason || null,
      },
    });

    return updated;
  }

  private async applyMediaData(
    mediaType: string,
    actionType: string,
    mediaId?: number | null,
    data: Record<string, any> = {},
  ): Promise<number> {
    const type = mediaType.toLowerCase();
    let targetMediaId: number;

    if (type === 'anime') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'UNKNOWN',
        episodeCount: data.episodes ? Number(data.episodes) : data.episodeCount ? Number(data.episodeCount) : null,
        episodeDuration: data.duration ? Number(data.duration) : data.episodeDuration ? Number(data.episodeDuration) : null,
        source: data.source || 'UNKNOWN',
        seasonSeason: data.seasonSeason || data.season || 'UNKNOWN',
        seasonYear: data.seasonYear ? Number(data.seasonYear) : data.startDateYear ? Number(data.startDateYear) : 2000,
        startDateYear: data.startDateYear ? Number(data.startDateYear) : 2000,
        startDateMonth: data.startDateMonth ? Number(data.startDateMonth) : null,
        startDateDay: data.startDateDay ? Number(data.startDateDay) : null,
        endDateYear: data.endDateYear ? Number(data.endDateYear) : null,
        endDateMonth: data.endDateMonth ? Number(data.endDateMonth) : null,
        endDateDay: data.endDateDay ? Number(data.endDateDay) : null,
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        hashtag: data.hashtag || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        countryOfOrigin: data.countryOfOrigin || null,
        siteUrl: data.siteUrl || null,
        externalLinks: Array.isArray(data.externalLinks) ? data.externalLinks : null,
        trailers: Array.isArray(data.trailers) ? data.trailers : null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        anilistId: data.anilistId ? Number(data.anilistId) : null,
        malId: data.malId ? Number(data.malId) : null,
        aniDBId: data.aniDBId ? Number(data.aniDBId) : null,
        tvDBId: data.tvDBId ? Number(data.tvDBId) : null,
        nextAiringEpisodeNumber: data.nextAiringEpisodeNumber ? Number(data.nextAiringEpisodeNumber) : null,
        nextAiringAt: data.nextAiringAt ? new Date(data.nextAiringAt) : null,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaAnimeV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaAnimeV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'manga') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'UNKNOWN',
        chapterCount: data.chapters ? Number(data.chapters) : data.chapterCount ? Number(data.chapterCount) : null,
        volumeCount: data.volumes ? Number(data.volumes) : data.volumeCount ? Number(data.volumeCount) : null,
        source: data.source || 'UNKNOWN',
        serialization: data.serialization || null,
        imprint: data.imprint || null,
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        demographics: Array.isArray(data.demographics) ? data.demographics : [],
        readingDirection: data.readingDirection || null,
        startDateYear: data.startDateYear ? Number(data.startDateYear) : null,
        startDateMonth: data.startDateMonth ? Number(data.startDateMonth) : null,
        startDateDay: data.startDateDay ? Number(data.startDateDay) : null,
        endDateYear: data.endDateYear ? Number(data.endDateYear) : null,
        endDateMonth: data.endDateMonth ? Number(data.endDateMonth) : null,
        endDateDay: data.endDateDay ? Number(data.endDateDay) : null,
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        hashtag: data.hashtag || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        countryOfOrigin: data.countryOfOrigin || null,
        siteUrl: data.siteUrl || null,
        externalLinks: Array.isArray(data.externalLinks) ? data.externalLinks : null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        anilistId: data.anilistId ? Number(data.anilistId) : null,
        malId: data.malId ? Number(data.malId) : null,
        mangaUpdatesId: data.mangaUpdatesId ? String(data.mangaUpdatesId) : null,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaMangaV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaMangaV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'tv') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || 'UNKNOWN',
        showType: data.showType || null,
        seasonCount: data.seasonCount ? Number(data.seasonCount) : null,
        episodeCount: data.episodeCount ? Number(data.episodeCount) : null,
        averageRuntime: data.averageRuntime || data.duration ? Number(data.averageRuntime || data.duration) : null,
        broadcastTime: data.broadcastTime || null,
        broadcastDays: Array.isArray(data.broadcastDays) ? data.broadcastDays : [],
        networks: Array.isArray(data.networks) ? data.networks : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        countryOfOrigin: data.countryOfOrigin || data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        homepage: data.homepage || data.siteUrl || null,
        siteUrl: data.siteUrl || data.homepage || null,
        firstAiredYear: data.firstAiredYear || data.startDateYear ? Number(data.firstAiredYear || data.startDateYear) : null,
        firstAiredMonth: data.firstAiredMonth || data.startDateMonth ? Number(data.firstAiredMonth || data.startDateMonth) : null,
        firstAiredDay: data.firstAiredDay || data.startDateDay ? Number(data.firstAiredDay || data.startDateDay) : null,
        lastAiredYear: data.lastAiredYear || data.endDateYear ? Number(data.lastAiredYear || data.endDateYear) : null,
        lastAiredMonth: data.lastAiredMonth || data.endDateMonth ? Number(data.lastAiredMonth || data.endDateMonth) : null,
        lastAiredDay: data.lastAiredDay || data.endDateDay ? Number(data.lastAiredDay || data.endDateDay) : null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        trailers: Array.isArray(data.trailers) ? data.trailers : null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        tvDBId: data.tvDBId || data.tvdbId ? Number(data.tvDBId || data.tvdbId) : Math.floor(Date.now() / 1000),
        imdbId: data.imdbId || null,
        tmdbId: data.tmdbId ? Number(data.tmdbId) : null,
        traktId: data.traktId ? Number(data.traktId) : null,
        tvmazeId: data.tvmazeId ? Number(data.tvmazeId) : null,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaTvV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaTvV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'movie') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || 'RELEASED',
        runtime: data.runtime || data.duration ? Number(data.runtime || data.duration) : null,
        budget: data.budget ? BigInt(data.budget) : null,
        revenue: data.boxOffice || data.revenue ? BigInt(data.boxOffice || data.revenue) : null,
        countryOfOrigin: data.countryOfOrigin || data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        homepage: data.homepage || data.siteUrl || null,
        siteUrl: data.siteUrl || data.homepage || null,
        releaseDateYear: data.releaseDateYear || data.startDateYear ? Number(data.releaseDateYear || data.startDateYear) : null,
        releaseDateMonth: data.releaseDateMonth || data.startDateMonth ? Number(data.releaseDateMonth || data.startDateMonth) : null,
        releaseDateDay: data.releaseDateDay || data.startDateDay ? Number(data.releaseDateDay || data.startDateDay) : null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        trailers: Array.isArray(data.trailers) ? data.trailers : null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        tvDBId: data.tvDBId || data.tvdbId ? Number(data.tvDBId || data.tvdbId) : Math.floor(Date.now() / 1000),
        imdbId: data.imdbId || null,
        tmdbId: data.tmdbId ? Number(data.tmdbId) : null,
        traktId: data.traktId ? Number(data.traktId) : null,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaMovieV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaMovieV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'game') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleString || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || null,
        titleNative: data.titleNative || null,
        slug: data.slug || null,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        backgroundImage: data.backgroundImage || data.bannerImage || null,
        bannerImage: data.bannerImage || data.backgroundImage || null,
        originalLanguage: data.originalLanguage || null,
        countryOfOrigin: data.countryOfOrigin || null,
        website: data.website || data.siteUrl || null,
        siteUrl: data.siteUrl || data.website || null,
        franchise: data.franchise || null,
        gameModes: Array.isArray(data.gameModes) ? data.gameModes : [],
        playerPerspectives: Array.isArray(data.playerPerspectives) ? data.playerPerspectives : [],
        releaseDateYear: data.releaseDateYear ? Number(data.releaseDateYear) : data.releasedYear ? Number(data.releasedYear) : null,
        releaseDateMonth: data.releaseDateMonth ? Number(data.releaseDateMonth) : null,
        releaseDateDay: data.releaseDateDay ? Number(data.releaseDateDay) : null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        platforms: Array.isArray(data.platforms) ? data.platforms : [],
        developers: Array.isArray(data.developers) ? data.developers : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        status: data.status || 'UNKNOWN',
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        esrbRating: data.esrbRating || null,
        pegiRating: data.pegiRating || null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        hltbMainStory: data.hltbMainStory ? Number(data.hltbMainStory) : null,
        hltbExtraStory: data.hltbExtraStory ? Number(data.hltbExtraStory) : null,
        hltbCompletionist: data.hltbCompletionist ? Number(data.hltbCompletionist) : null,
        rawgId: data.rawgId ? Number(data.rawgId) : null,
        igdbId: data.igdbId ? Number(data.igdbId) : !data.rawgId ? Math.floor(Date.now() / 1000) : null,
        steamAppId: data.steamAppId ? Number(data.steamAppId) : null,
        giantbombId: data.giantbombId || null,
        vndbId: data.vndbId || null,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaGameV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaGameV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'book') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleString || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || null,
        subtitle: data.subtitle || null,
        slug: data.slug || null,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        series: data.series || null,
        seriesPosition: data.seriesPosition ? Number(data.seriesPosition) : null,
        format: data.format || null,
        status: data.status || 'UNKNOWN',
        releaseDateYear: data.releaseDateYear ? Number(data.releaseDateYear) : data.publishedYear ? Number(data.publishedYear) : null,
        releaseDateMonth: data.releaseDateMonth ? Number(data.releaseDateMonth) : null,
        releaseDateDay: data.releaseDateDay ? Number(data.releaseDateDay) : null,
        pageCount: data.pageCount ? Number(data.pageCount) : null,
        chapterCount: data.chapters ? Number(data.chapters) : data.chapterCount ? Number(data.chapterCount) : null,
        volumeCount: data.volumes ? Number(data.volumes) : data.volumeCount ? Number(data.volumeCount) : null,
        originalLanguage: data.language || data.originalLanguage || null,
        countryOfOrigin: data.countryOfOrigin || null,
        isbn10: data.isbn10 || null,
        isbn13: data.isbn13 || null,
        website: data.website || data.siteUrl || null,
        siteUrl: data.siteUrl || data.website || null,
        previewLink: data.previewLink || null,
        infoLink: data.infoLink || null,
        buyLink: data.buyLink || null,
        retailPrice: data.retailPrice ? Number(data.retailPrice) : null,
        retailPriceCurrency: data.retailPriceCurrency || null,
        ageRating: data.ageRating || null,
        ageRatingGuide: data.ageRatingGuide || null,
        subjects: Array.isArray(data.subjects) ? data.subjects : Array.isArray(data.genres) ? data.genres : [],
        genres: Array.isArray(data.genres) ? data.genres : Array.isArray(data.subjects) ? data.subjects : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        authors: Array.isArray(data.authors) ? data.authors : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        googleBookId: data.googleBookId || `custom_${Date.now()}`,
        locked: typeof data.locked === 'boolean' ? data.locked : true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaBookV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaBookV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else {
      throw new BadRequestException(`Unsupported mediaType: ${mediaType}`);
    }

    await this.saveEpisodes(type, targetMediaId, data.episodes);
    await this.saveCharacters(type, targetMediaId, data.characters);
    await this.saveStaff(type, targetMediaId, data.staff);
    await this.saveStudios(type, targetMediaId, data.studiosList || data.studiosData);
    await this.saveRelations(type, targetMediaId, data.relations);

    return targetMediaId;
  }

  // Search endpoints for modal auto-completers
  async searchCharacters(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaCharacterV2.findMany({
      where: {
        OR: [
          { namePrimary: { contains: trimmed, mode: 'insensitive' } },
          { nameNative: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        namePrimary: true,
        nameNative: true,
        image: true,
      },
      take: 20,
    });
  }

  async searchActors(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaActorV2.findMany({
      where: {
        OR: [
          { namePrimary: { contains: trimmed, mode: 'insensitive' } },
          { nameNative: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        namePrimary: true,
        nameNative: true,
        image: true,
      },
      take: 20,
    });
  }

  async searchStudios(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaStudioV2.findMany({
      where: {
        name: { contains: trimmed, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        isAnimationStudio: true,
        siteUrl: true,
      },
      take: 20,
    });
  }

  async searchRelations(mediaType: string, query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];
    const type = (mediaType || 'anime').toLowerCase();

    if (type === 'anime') {
      return this.prisma.client.aquilaAnimeV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'manga') {
      return this.prisma.client.aquilaMangaV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'tv') {
      return this.prisma.client.aquilaTvV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'movie') {
      return this.prisma.client.aquilaMovieV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'game') {
      return this.prisma.client.aquilaGameV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleNative: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'book') {
      return this.prisma.client.aquilaBookV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { subtitle: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, subtitle: true, coverImage: true },
        take: 20,
      });
    }
    return [];
  }

  private async saveCharacters(mediaType: string, mediaId: number, characters: any[]) {
    if (!Array.isArray(characters)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaCharacterV2.deleteMany({
      where: { mediaType: mediaEnum, mediaId },
    }).catch(() => null);

    for (const char of characters) {
      let charId = char.characterId ? Number(char.characterId) : null;

      // Handle inline created NEW Character
      if (!charId && (char.isNew || char.namePrimary || char.name)) {
        const namePrimary = char.namePrimary || char.name || 'Unknown Character';
        const createdChar = await this.prisma.client.aquilaCharacterV2.create({
          data: {
            namePrimary,
            nameNative: char.nameNative || null,
            image: char.image || null,
            description: char.description || null,
            gender: char.gender || null,
          },
        }).catch(() => null);
        if (createdChar) charId = createdChar.id;
      }

      if (!charId) continue;

      const charRoleStr = char.role ? String(char.role).toUpperCase() : '';
      const charRole = ['MAIN', 'SUPPORTING', 'BACKGROUND'].includes(charRoleStr)
        ? (charRoleStr as CharacterRole)
        : CharacterRole.MAIN;

      await this.prisma.client.aquilaMediaCharacterV2.create({
        data: {
          mediaType: mediaEnum,
          mediaId,
          animeId: mediaEnum === MediaType.ANIME ? mediaId : null,
          mangaId: mediaEnum === MediaType.MANGA ? mediaId : null,
          movieId: mediaEnum === MediaType.MOVIE ? mediaId : null,
          tvId: mediaEnum === MediaType.TV ? mediaId : null,
          gameId: mediaEnum === MediaType.GAME ? mediaId : null,
          bookId: mediaEnum === MediaType.BOOK ? mediaId : null,
          characterId: charId,
          actorId: char.voiceActorId || char.actorId ? Number(char.voiceActorId || char.actorId) : null,
          role: charRole,
        },
      }).catch(() => null);
    }
  }

  private async saveStaff(mediaType: string, mediaId: number, staffList: any[]) {
    if (!Array.isArray(staffList)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaStaffV2.deleteMany({
      where: { mediaType: mediaEnum, mediaId },
    }).catch(() => null);

    for (const item of staffList) {
      let staffId = item.staffId || item.actorId ? Number(item.staffId || item.actorId) : null;

      // Handle inline created NEW Staff/Actor
      if (!staffId && (item.isNew || item.namePrimary || item.name)) {
        const namePrimary = item.namePrimary || item.name || 'Unknown Staff';
        const createdStaff = await this.prisma.client.aquilaActorV2.create({
          data: {
            namePrimary,
            nameNative: item.nameNative || null,
            image: item.image || null,
            description: item.description || null,
            language: item.language || null,
          },
        }).catch(() => null);
        if (createdStaff) staffId = createdStaff.id;
      }

      if (!staffId) continue;

      const roleStr = item.role ? String(item.role).toUpperCase() : 'OTHER';

      await this.prisma.client.aquilaMediaStaffV2.create({
        data: {
          mediaType: mediaEnum,
          mediaId,
          animeId: mediaEnum === MediaType.ANIME ? mediaId : null,
          mangaId: mediaEnum === MediaType.MANGA ? mediaId : null,
          movieId: mediaEnum === MediaType.MOVIE ? mediaId : null,
          tvId: mediaEnum === MediaType.TV ? mediaId : null,
          gameId: mediaEnum === MediaType.GAME ? mediaId : null,
          bookId: mediaEnum === MediaType.BOOK ? mediaId : null,
          staffId,
          role: roleStr as any,
          customRole: item.customRole || null,
        },
      }).catch(() => null);
    }
  }

  private async saveStudios(mediaType: string, mediaId: number, studiosList: any[]) {
    if (!Array.isArray(studiosList)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaStudioV2.deleteMany({
      where: { mediaType: mediaEnum, mediaId },
    }).catch(() => null);

    for (const item of studiosList) {
      let studioId = item.studioId || item.id ? Number(item.studioId || item.id) : null;

      // Handle inline created NEW Studio
      if (!studioId && (item.isNew || item.name)) {
        const name = item.name || 'Unknown Studio';
        const createdStudio = await this.prisma.client.aquilaStudioV2.create({
          data: {
            name,
            isAnimationStudio: typeof item.isAnimationStudio === 'boolean' ? item.isAnimationStudio : true,
            siteUrl: item.siteUrl || null,
          },
        }).catch(() => null);
        if (createdStudio) studioId = createdStudio.id;
      }

      if (!studioId) continue;

      await this.prisma.client.aquilaMediaStudioV2.create({
        data: {
          mediaType: mediaEnum,
          mediaId,
          animeId: mediaEnum === MediaType.ANIME ? mediaId : null,
          mangaId: mediaEnum === MediaType.MANGA ? mediaId : null,
          movieId: mediaEnum === MediaType.MOVIE ? mediaId : null,
          tvId: mediaEnum === MediaType.TV ? mediaId : null,
          gameId: mediaEnum === MediaType.GAME ? mediaId : null,
          bookId: mediaEnum === MediaType.BOOK ? mediaId : null,
          studioId,
          isMain: typeof item.isMain === 'boolean' ? item.isMain : false,
        },
      }).catch(() => null);
    }
  }

  private getReciprocalRelationType(relationType: string): string {
    switch (relationType) {
      case 'SEQUEL':
        return 'PREQUEL';
      case 'PREQUEL':
        return 'SEQUEL';
      case 'ADAPTATION':
        return 'ADAPTATION';
      case 'SIDE_STORY':
        return 'PARENT';
      case 'SPIN_OFF':
        return 'PARENT';
      case 'ALTERNATIVE':
        return 'ALTERNATIVE';
      case 'PARENT':
        return 'SIDE_STORY';
      default:
        return 'OTHER';
    }
  }

  private async saveRelations(mediaType: string, mediaId: number, relations: any[]) {
    if (!Array.isArray(relations)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaRelationV2.deleteMany({
      where: { sourceType: mediaEnum, sourceId: mediaId },
    }).catch(() => null);

    for (const rel of relations) {
      if (!rel.relatedMediaId) continue;
      const targetId = Number(rel.relatedMediaId);
      const targetTypeStr = (rel.targetType || type).toLowerCase();
      const targetEnum = MEDIA_TYPE_MAP[targetTypeStr] || mediaEnum;

      const relTypeStr = (rel.relationType || 'SEQUEL').toUpperCase();
      const relType = relTypeStr in RelationType ? (relTypeStr as RelationType) : RelationType.OTHER;

      const reciprocalTypeStr = this.getReciprocalRelationType(relTypeStr);
      const reciprocalType = reciprocalTypeStr in RelationType ? (reciprocalTypeStr as RelationType) : RelationType.OTHER;

      // 1. Forward relation: Source Media -> Target Media
      await this.prisma.client.aquilaMediaRelationV2.create({
        data: {
          sourceType: mediaEnum,
          sourceId: mediaId,
          targetType: targetEnum,
          targetId: targetId,
          type: relType,
        },
      }).catch(() => null);

      // 2. Reciprocal relation: Target Media -> Source Media
      await this.prisma.client.aquilaMediaRelationV2.deleteMany({
        where: {
          sourceType: targetEnum,
          sourceId: targetId,
          targetType: mediaEnum,
          targetId: mediaId,
        },
      }).catch(() => null);

      await this.prisma.client.aquilaMediaRelationV2.create({
        data: {
          sourceType: targetEnum,
          sourceId: targetId,
          targetType: mediaEnum,
          targetId: mediaId,
          type: reciprocalType,
        },
      }).catch(() => null);
    }
  }

  private async saveEpisodes(mediaType: string, mediaId: number, episodes: any[]) {
    if (!Array.isArray(episodes) || episodes.length === 0) return;
    const type = mediaType.toLowerCase();

    if (type === 'anime') {
      await this.prisma.client.aquilaAnimeEpisode.deleteMany({ where: { animeId: mediaId } }).catch(() => null);
      for (const ep of episodes) {
        const epNum = Number(ep.number ?? ep.episodeNumber) || 1;
        const epTypeStr = String(ep.type || ep.episodeType || 'REGULAR').toUpperCase();
        await this.prisma.client.aquilaAnimeEpisode.create({
          data: {
            animeId: mediaId,
            number: epNum,
            type: epTypeStr as any,
            titlePrimary: ep.titlePrimary || ep.title || `Episode ${epNum}`,
            titleSecondary: ep.titleSecondary || null,
            titleNative: ep.titleNative || null,
            description: ep.description || ep.overview || null,
            duration: ep.duration ? Number(ep.duration) : null,
            airDate: ep.airDate ? new Date(ep.airDate) : null,
            thumbnail: ep.thumbnail || ep.image || null,
            isFiller: typeof ep.isFiller === 'boolean' ? ep.isFiller : false,
            isRecap: typeof ep.isRecap === 'boolean' ? ep.isRecap : false,
            opStart: ep.opStart != null ? Number(ep.opStart) : null,
            opEnd: ep.opEnd != null ? Number(ep.opEnd) : null,
            edStart: ep.edStart != null ? Number(ep.edStart) : null,
            edEnd: ep.edEnd != null ? Number(ep.edEnd) : null,
            recapStart: ep.recapStart != null ? Number(ep.recapStart) : null,
            recapEnd: ep.recapEnd != null ? Number(ep.recapEnd) : null,
          },
        }).catch(() => null);
      }
    } else if (type === 'tv') {
      await this.prisma.client.aquilaTvEpisodeV2.deleteMany({ where: { tvId: mediaId } }).catch(() => null);
      for (const ep of episodes) {
        const epNum = Number(ep.number ?? ep.episodeNumber) || 1;
        const seasonNum = Number(ep.seasonNumber ?? ep.seasonNum) || 1;
        await this.prisma.client.aquilaTvEpisodeV2.create({
          data: {
            tvId: mediaId,
            seasonNumber: seasonNum,
            episodeNumber: epNum,
            titlePrimary: ep.titlePrimary || ep.title || `Episode ${epNum}`,
            titleSecondary: ep.titleSecondary || null,
            titleNative: ep.titleNative || null,
            description: ep.description || ep.overview || null,
            duration: ep.duration ? Number(ep.duration) : null,
            airDate: ep.airDate ? new Date(ep.airDate) : null,
            thumbnail: ep.thumbnail || ep.image || null,
            isFiller: typeof ep.isFiller === 'boolean' ? ep.isFiller : false,
            isRecap: typeof ep.isRecap === 'boolean' ? ep.isRecap : false,
            opStart: ep.opStart != null ? Number(ep.opStart) : null,
            opEnd: ep.opEnd != null ? Number(ep.opEnd) : null,
            edStart: ep.edStart != null ? Number(ep.edStart) : null,
            edEnd: ep.edEnd != null ? Number(ep.edEnd) : null,
            recapStart: ep.recapStart != null ? Number(ep.recapStart) : null,
            recapEnd: ep.recapEnd != null ? Number(ep.recapEnd) : null,
          },
        }).catch(() => null);
      }
    }
  }
}

