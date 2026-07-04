import { Controller, Param, UseGuards, Get, Post } from '@nestjs/common';
import { BookService } from './book.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AquilaFlags } from '@runa/permissions';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { SearchBookDto, BookDetailDto, BookRefreshDto } from './book.dto';
import type { BookSearchEntity, BookEntity } from './book.entities';

@Controller('book')
@UseGuards(AuthGuard, PermissionsGuard)
export class BookController {
  private readonly moduleCode: string = 'BkCtr-';

  constructor(private readonly bookService: BookService) {}

  @Public()
  @Get('search/:name')
  async search(@Param() params: SearchBookDto): Promise<BookSearchEntity[]> {
    return this.bookService.search(params.name);
  }

  @Public()
  @Get(':id')
  async bookDetail(
    @Param() params: BookDetailDto,
  ): Promise<BookEntity | undefined> {
    return await this.bookService.getBook(params.id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshBook(
    @Param() params: BookRefreshDto,
  ): Promise<BookEntity | undefined | null> {
    return await this.bookService.refreshBook(params.id);
  }
}
