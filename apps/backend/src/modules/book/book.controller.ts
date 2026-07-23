import { Controller, Param, UseGuards, Get, Post, Query } from '@nestjs/common';
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
  async getBook(
    @Param() params: BookDetailDto | any,
  ): Promise<BookEntity | undefined> {
    const id = typeof params === 'object' && params !== null && 'id' in params ? params.id : params;
    return await this.bookService.getBook(id);
  }

  @Post(':id/refresh')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshBook(
    @Param() params: BookRefreshDto,
    @Query('force') forceQuery?: string,
  ): Promise<BookEntity | undefined | null> {
    const force = forceQuery === 'true' || forceQuery === '1';
    return await this.bookService.refreshBook(
      params.id,
      ...(forceQuery !== undefined ? [force] : []),
    );
  }
}
