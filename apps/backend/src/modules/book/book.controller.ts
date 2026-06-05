import { Controller, Param, UseGuards, Get, Query } from '@nestjs/common';
import { BookService } from './book.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('book')
@UseGuards(DualAuthGuard)
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }) {
    return this.bookService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getBook(@Param('id') id: string) {
    return this.bookService.getBook(id);
  }
}
