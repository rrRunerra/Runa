import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { BookService } from '../book/book.service';
import { GameService } from '../game/game.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { getTimestampMs } from '../../common/utils/time.utils';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isUpdatedInLast7Days(
  updatedAtVal: number | string | Date | null | undefined,
): boolean {
  const updatedMs = getTimestampMs(updatedAtVal);
  if (updatedMs === null) return false;
  return Date.now() - updatedMs < SEVEN_DAYS_MS;
}

@Injectable()
export class MediaUpdateService {
  private readonly logger = new Logger(MediaUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly animeService: AnimeService,
    private readonly mangaService: MangaService,
    private readonly bookService: BookService,
    private readonly gameService: GameService,
    private readonly movieService: MovieService,
    private readonly tvService: TvService,
  ) {}

  /**
   * Runs weekly on Sunday at midnight.
   * Updates all V2 media that have not been updated in the last 7 days (or have null provider update timestamps).
   */
  @Cron('0 0 * * 0')
  public async updateRecentMedia(): Promise<void> {
    this.logger.log('Starting weekly background V2 media update job...');

    // 1. Anime V2
    try {
      const animes = await this.prisma.client.aquilaAnimeV2.findMany({
        where: { locked: false },
        select: { id: true, alUpdatedAt: true },
      });

      const toUpdateAnime = animes.filter((a) => {
        const updatedMs = getTimestampMs(a.alUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateAnime.length} V2 Anime records to update.`);
      for (const item of toUpdateAnime) {
        try {
          await this.animeService.refreshAnime(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Anime ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Anime update sub-job:', err);
    }

    // 2. Manga V2
    try {
      const mangas = await this.prisma.client.aquilaMangaV2.findMany({
        where: { locked: false },
        select: { id: true, alUpdatedAt: true },
      });

      const toUpdateManga = mangas.filter((m) => {
        const updatedMs = getTimestampMs(m.alUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateManga.length} V2 Manga records to update.`);
      for (const item of toUpdateManga) {
        try {
          await this.mangaService.refreshManga(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Manga ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Manga update sub-job:', err);
    }

    // 3. Book V2
    try {
      const books = await this.prisma.client.aquilaBookV2.findMany({
        where: { locked: false },
        select: { id: true, googleBooksUpdatedAt: true },
      });

      const toUpdateBook = books.filter((b) => {
        const updatedMs = getTimestampMs(b.googleBooksUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateBook.length} V2 Book records to update.`);
      for (const item of toUpdateBook) {
        try {
          await this.bookService.refreshBook(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Book ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Book update sub-job:', err);
    }

    // 4. Game V2
    try {
      const games = await this.prisma.client.aquilaGameV2.findMany({
        where: { locked: false },
        select: { id: true, rawgUpdatedAt: true },
      });

      const toUpdateGame = games.filter((g) => {
        const updatedMs = getTimestampMs(g.rawgUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateGame.length} V2 Game records to update.`);
      for (const item of toUpdateGame) {
        try {
          await this.gameService.refreshGame(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Game ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Game update sub-job:', err);
    }

    // 5. Movie V2
    try {
      const movies = await this.prisma.client.aquilaMovieV2.findMany({
        where: { locked: false },
        select: { id: true, tvdbUpdatedAt: true },
      });

      const toUpdateMovie = movies.filter((m) => {
        const updatedMs = getTimestampMs(m.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateMovie.length} V2 Movie records to update.`);
      for (const item of toUpdateMovie) {
        try {
          await this.movieService.refreshMovie(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Movie ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Movie update sub-job:', err);
    }

    // 6. TV V2
    try {
      const tvs = await this.prisma.client.aquilaTvV2.findMany({
        where: { locked: false },
        select: { id: true, tvdbUpdatedAt: true },
      });

      const toUpdateTv = tvs.filter((t) => {
        const updatedMs = getTimestampMs(t.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        return Date.now() - updatedMs >= SEVEN_DAYS_MS;
      });

      this.logger.log(`Found ${toUpdateTv.length} V2 TV records to update.`);
      for (const item of toUpdateTv) {
        try {
          await this.tvService.refreshTv(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 TV ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 TV update sub-job:', err);
    }

    this.logger.log('Weekly background V2 media update job completed.');
  }

  /**
   * Runs weekly on Sunday at 3 AM.
   * Updates all media whose status is RELEASING, UNKNOWN, or HIATUS / ON_HIATUS every week.
   * Skips any media updated in the last 7 days.
   * If provider update timestamp is null, updates it regardless of status.
   */
  @Cron('0 3 * * 0')
  public async updateActiveMediaWeekly(): Promise<void> {
    this.logger.log('Starting weekly background V2 active media update job...');

    // 1. Anime V2
    try {
      const animes = await this.prisma.client.aquilaAnimeV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, alUpdatedAt: true },
      });
      const activeStatuses = new Set(['RELEASING', 'UNKNOWN', 'HIATUS', 'NOT_YET_RELEASED']);
      const toUpdate = animes.filter((item) => {
        const updatedMs = getTimestampMs(item.alUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 Anime records to update.`);
      for (const item of toUpdate) {
        try {
          await this.animeService.refreshAnime(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Anime ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Anime active update sub-job:', err);
    }

    // 2. Manga V2
    try {
      const mangas = await this.prisma.client.aquilaMangaV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, alUpdatedAt: true },
      });
      const activeStatuses = new Set(['RELEASING', 'UNKNOWN', 'HIATUS', 'NOT_YET_RELEASED']);
      const toUpdate = mangas.filter((item) => {
        const updatedMs = getTimestampMs(item.alUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 Manga records to update.`);
      for (const item of toUpdate) {
        try {
          await this.mangaService.refreshManga(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Manga ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Manga active update sub-job:', err);
    }

    // 3. Book V2
    try {
      const books = await this.prisma.client.aquilaBookV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, googleBooksUpdatedAt: true },
      });
      const activeStatuses = new Set(['RELEASING', 'UNKNOWN', 'ON_HIATUS', 'HIATUS']);
      const toUpdate = books.filter((item) => {
        const updatedMs = getTimestampMs(item.googleBooksUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 Book records to update.`);
      for (const item of toUpdate) {
        try {
          await this.bookService.refreshBook(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Book ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Book active update sub-job:', err);
    }

    // 4. Game V2
    try {
      const games = await this.prisma.client.aquilaGameV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, rawgUpdatedAt: true },
      });
      const activeStatuses = new Set([
        'EARLY_ACCESS',
        'ANNOUNCED',
        'IN_DEVELOPMENT',
        'DELAYED',
        'UNKNOWN',
        'RELEASING',
      ]);
      const toUpdate = games.filter((item) => {
        const updatedMs = getTimestampMs(item.rawgUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 Game records to update.`);
      for (const item of toUpdate) {
        try {
          await this.gameService.refreshGame(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Game ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Game active update sub-job:', err);
    }

    // 5. Movie V2
    try {
      const movies = await this.prisma.client.aquilaMovieV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, tvdbUpdatedAt: true },
      });
      const activeStatuses = new Set([
        'IN_PRODUCTION',
        'POST_PRODUCTION',
        'RUMORED',
        'UNKNOWN',
        'RELEASING',
      ]);
      const toUpdate = movies.filter((item) => {
        const updatedMs = getTimestampMs(item.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 Movie records to update.`);
      for (const item of toUpdate) {
        try {
          await this.movieService.refreshMovie(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Movie ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 Movie active update sub-job:', err);
    }

    // 6. TV V2
    try {
      const tvs = await this.prisma.client.aquilaTvV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, tvdbUpdatedAt: true },
      });
      const activeStatuses = new Set([
        'RETURNING_SERIES',
        'IN_PRODUCTION',
        'UPCOMING',
        'UNKNOWN',
        'RELEASING',
      ]);
      const toUpdate = tvs.filter((item) => {
        const updatedMs = getTimestampMs(item.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return activeStatuses.has(String(item.status || '').toUpperCase());
      });

      this.logger.log(`Found ${toUpdate.length} active V2 TV records to update.`);
      for (const item of toUpdate) {
        try {
          await this.tvService.refreshTv(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 TV ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during V2 TV active update sub-job:', err);
    }

    this.logger.log('Weekly background V2 active media update job completed.');
  }

  /**
   * Runs daily at 4 AM.
   * Updates media whose status is COMPLETED / FINISHED / ENDED / RELEASED with a 5% random chance each day.
   * Skips any media updated in the last 7 days.
   * If provider update timestamp is null, updates it regardless of status.
   */
  @Cron('0 4 * * *')
  public async updateCompletedMediaDaily(): Promise<void> {
    this.logger.log('Starting daily background V2 completed media update job (5% random daily selection)...');

    const isCompletedStatus = (status?: string | null): boolean => {
      if (!status) return false;
      const s = status.toUpperCase();
      return ['FINISHED', 'COMPLETED', 'ENDED', 'RELEASED', 'PUBLISHED', 'CANCELLED', 'CANCELED'].includes(s);
    };

    // 1. Anime V2
    try {
      const animes = await this.prisma.client.aquilaAnimeV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, alUpdatedAt: true },
      });
      const toUpdate = animes.filter((item) => {
        const updatedMs = getTimestampMs(item.alUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 Anime records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.animeService.refreshAnime(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Anime ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 Anime completed update sub-job:', err);
    }

    // 2. Manga V2
    try {
      const mangas = await this.prisma.client.aquilaMangaV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, alUpdatedAt: true },
      });
      const toUpdate = mangas.filter((item) => {
        const updatedMs = getTimestampMs(item.alUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 Manga records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.mangaService.refreshManga(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Manga ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 Manga completed update sub-job:', err);
    }

    // 3. Book V2
    try {
      const books = await this.prisma.client.aquilaBookV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, googleBooksUpdatedAt: true },
      });
      const toUpdate = books.filter((item) => {
        const updatedMs = getTimestampMs(item.googleBooksUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 Book records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.bookService.refreshBook(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Book ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 Book completed update sub-job:', err);
    }

    // 4. Game V2
    try {
      const games = await this.prisma.client.aquilaGameV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, rawgUpdatedAt: true },
      });
      const toUpdate = games.filter((item) => {
        const updatedMs = getTimestampMs(item.rawgUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 Game records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.gameService.refreshGame(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Game ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 Game completed update sub-job:', err);
    }

    // 5. Movie V2
    try {
      const movies = await this.prisma.client.aquilaMovieV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, tvdbUpdatedAt: true },
      });
      const toUpdate = movies.filter((item) => {
        const updatedMs = getTimestampMs(item.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 Movie records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.movieService.refreshMovie(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 Movie ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 Movie completed update sub-job:', err);
    }

    // 6. TV V2
    try {
      const tvs = await this.prisma.client.aquilaTvV2.findMany({
        where: { locked: false },
        select: { id: true, status: true, tvdbUpdatedAt: true },
      });
      const toUpdate = tvs.filter((item) => {
        const updatedMs = getTimestampMs(item.tvdbUpdatedAt);
        if (updatedMs === null) return true;
        if (Date.now() - updatedMs < SEVEN_DAYS_MS) return false;
        return isCompletedStatus(item.status) && Math.random() < 0.05;
      });

      this.logger.log(`Found ${toUpdate.length} completed V2 TV records selected for daily update.`);
      for (const item of toUpdate) {
        try {
          await this.tvService.refreshTv(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh V2 TV ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error in daily V2 TV completed update sub-job:', err);
    }

    this.logger.log('Daily background V2 completed media update job finished.');
  }
}
