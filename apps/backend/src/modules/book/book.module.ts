import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { BookRepository } from './repositories/book.repository';
import { BookQueueService } from './services/book-queue.service';

@Module({
  controllers: [BookController],
  providers: [BookService, BookRepository, BookQueueService],
  exports: [BookService, BookRepository, BookQueueService],
})
export class BookModule {}
