import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
   * Updates all V2 media released in the past 3 months by triggering their refresh methods.
   */
  @Cron('0 0 * * 0')
  public async updateRecentMedia(): Promise<void> {
    this.logger.log('Starting weekly background V2 media update job...');

    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const targetYear = threeMonthsAgo.getFullYear();
    const startMonthIndex = threeMonthsAgo.getFullYear() * 12 + threeMonthsAgo.getMonth();
    const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();

    const isWithinPastThreeMonths = (
      year: number | null | undefined,
      month: number | null | undefined,
    ): boolean => {
      if (!year) return false;
      const m = month ? month - 1 : 0;
      const itemMonthIndex = year * 12 + m;
      return itemMonthIndex >= startMonthIndex && itemMonthIndex <= currentMonthIndex;
    };

    // 1. Anime V2
    try {
      const animes = await this.prisma.client.aquilaAnimeV2.findMany({
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
        where: {
          locked: false,
          releaseDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          releaseDateYear: true,
          releaseDateMonth: true,
        },
      });

      const toUpdateBook = books.filter((b) =>
        isWithinPastThreeMonths(b.releaseDateYear, b.releaseDateMonth),
      );

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
        where: {
          locked: false,
          releaseDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          releaseDateYear: true,
          releaseDateMonth: true,
        },
      });

      const toUpdateGame = games.filter((g) =>
        isWithinPastThreeMonths(g.releaseDateYear, g.releaseDateMonth),
      );

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
        where: {
          locked: false,
          releaseDateYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          releaseDateYear: true,
          releaseDateMonth: true,
        },
      });

      const toUpdateMovie = movies.filter((m) =>
        isWithinPastThreeMonths(m.releaseDateYear, m.releaseDateMonth),
      );

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
        where: {
          locked: false,
          firstAiredYear: { gte: targetYear - 1 },
        },
        select: {
          id: true,
          firstAiredYear: true,
          firstAiredMonth: true,
        },
      });

      const toUpdateTv = tvs.filter((t) =>
        isWithinPastThreeMonths(t.firstAiredYear, t.firstAiredMonth),
      );

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
}
