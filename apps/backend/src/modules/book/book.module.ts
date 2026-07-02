import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { BookRepository } from './book.repository';
import { BookQueueService } from './book-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { BookExternal } from './book.external';

@Module({
  controllers: [BookController],
  providers: [
    BookService,
    BookRepository,
    BookQueueService,
    CacheService,
    BookExternal,
  ],
  exports: [BookService],
})
export class BookModule {}
