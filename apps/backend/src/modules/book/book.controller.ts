import { Controller, Param, UseGuards, Get, Query, Post, Req, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { BookService } from './book.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AquilaBitField } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';

@Controller('book')
@UseGuards(DualAuthGuard)
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly cacheService: CacheService,
  ) {}

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

  @Public()
  @Get('details/:id/related')
  async getRelatedBooks(@Param('id') id: string) {
    return this.bookService.getRelatedBooks(id);
  }

  @Public()
  @Get('details/:id/editions')
  async getBookEditions(@Param('id') id: string) {
    return this.bookService.getBookEditions(id);
  }

  @Post('refresh/:id')
  async refreshBook(@Param('id') id: string, @Req() req: any) {
    const bitfield = AquilaBitField.fromRaw(req.user.permissions);
    if (!bitfield.has('MEDIA_REFRESH')) {
      throw new ForbiddenException('You do not have permission to refresh media');
    }

    const cooldownKey = `cooldown:refresh:book:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new HttpException(
        'This media was refreshed recently. Please wait before refreshing again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.bookService.getBook(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
