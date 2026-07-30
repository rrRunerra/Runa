import { Module, forwardRef } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { BookRepository } from './book.repository';
import { BookQueueService } from './book-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { BookExternal } from './book.external';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';

@Module({
  imports: [
    forwardRef(() => AnimeModule),
    forwardRef(() => MangaModule),
  ],
  controllers: [BookController],
  providers: [
    BookService,
    BookRepository,
    BookQueueService,
    CacheService,
    BookExternal,
  ],
  exports: [BookService, BookRepository, BookQueueService],
})
export class BookModule {}
