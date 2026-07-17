import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { BookService } from '../book/book.service';
import { GameService } from '../game/game.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';

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
   * Updates all media released in the past 3 months by triggering their refresh methods.
   */
  @Cron('0 0 * * 0')
  public async updateRecentMedia(): Promise<void> {
    this.logger.log('Starting weekly background media update job...');

    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const targetYear = threeMonthsAgo.getFullYear();
    const startMonthIndex = threeMonthsAgo.getFullYear() * 12 + threeMonthsAgo.getMonth();
    const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();

    // Helper to check if a release date is in the past 3 months (month-level accuracy)
    const isWithinPastThreeMonths = (
      year: number | null | undefined,
      month: number | null | undefined,
    ): boolean => {
      if (!year) return false;
      const m = month ? month - 1 : 0;
      const itemMonthIndex = year * 12 + m;
      return itemMonthIndex >= startMonthIndex && itemMonthIndex <= currentMonthIndex;
    };

    // 1. Anime
    try {
      const animes = await this.prisma.client.aquilaAnime.findMany({
        where: {
          locked: false,
          startDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          startDateYear: true,
          startDateMonth: true,
        },
      });

      const toUpdateAnime = animes.filter((a) =>
        isWithinPastThreeMonths(a.startDateYear, a.startDateMonth),
      );

      this.logger.log(`Found ${toUpdateAnime.length} Anime records to update.`);
      for (const item of toUpdateAnime) {
        try {
          await this.animeService.refreshAnime(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh Anime ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during Anime update sub-job:', err);
    }

    // 2. Manga
    try {
      const mangas = await this.prisma.client.aquilaManga.findMany({
        where: {
          locked: false,
          startDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          startDateYear: true,
          startDateMonth: true,
        },
      });

      const toUpdateManga = mangas.filter((m) =>
        isWithinPastThreeMonths(m.startDateYear, m.startDateMonth),
      );

      this.logger.log(`Found ${toUpdateManga.length} Manga records to update.`);
      for (const item of toUpdateManga) {
        try {
          await this.mangaService.refreshManga(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh Manga ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during Manga update sub-job:', err);
    }

    // 3. Book
    try {
      const books = await this.prisma.client.aquilaBook.findMany({
        where: {
          locked: false,
          publishedYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          publishedYear: true,
          publishedMonth: true,
        },
      });

      const toUpdateBook = books.filter((b) =>
        isWithinPastThreeMonths(b.publishedYear, b.publishedMonth),
      );

      this.logger.log(`Found ${toUpdateBook.length} Book records to update.`);
      for (const item of toUpdateBook) {
        try {
          await this.bookService.refreshBook(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh Book ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during Book update sub-job:', err);
    }

    // 4. Game
    try {
      const games = await this.prisma.client.aquilaGame.findMany({
        where: {
          locked: false,
          releasedYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          releasedYear: true,
          releasedMonth: true,
        },
      });

      const toUpdateGame = games.filter((g) =>
        isWithinPastThreeMonths(g.releasedYear, g.releasedMonth),
      );

      this.logger.log(`Found ${toUpdateGame.length} Game records to update.`);
      for (const item of toUpdateGame) {
        try {
          await this.gameService.refreshGame(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh Game ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during Game update sub-job:', err);
    }

    // 5. Movie
    try {
      const movies = await this.prisma.client.aquilaMovie.findMany({
        where: {
          locked: false,
          startDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          startDateYear: true,
          startDateMonth: true,
        },
      });

      const toUpdateMovie = movies.filter((m) =>
        isWithinPastThreeMonths(m.startDateYear, m.startDateMonth),
      );

      this.logger.log(`Found ${toUpdateMovie.length} Movie records to update.`);
      for (const item of toUpdateMovie) {
        try {
          await this.movieService.refreshMovie(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh Movie ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during Movie update sub-job:', err);
    }

    // 6. TV
    try {
      const tvs = await this.prisma.client.aquilaTv.findMany({
        where: {
          locked: false,
          startDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          startDateYear: true,
          startDateMonth: true,
        },
      });

      const toUpdateTv = tvs.filter((t) =>
        isWithinPastThreeMonths(t.startDateYear, t.startDateMonth),
      );

      this.logger.log(`Found ${toUpdateTv.length} TV records to update.`);
      for (const item of toUpdateTv) {
        try {
          await this.tvService.refreshTv(item.id);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to refresh TV ID ${item.id}: ${errMsg}`);
        }
      }
    } catch (err: unknown) {
      this.logger.error('Error occurred during TV update sub-job:', err);
    }

    this.logger.log('Weekly background media update job completed.');
  }
}
