import { Controller, Param, UseGuards, Get, Query, Post } from '@nestjs/common';
import { rrTooManyRequestsException } from 'src/providers/error';
import { BookService } from './book.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';
import { AquilaFlags } from '@runa/permissions';
import { CacheService } from '../../providers/cache/cache.service';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('book')
@UseGuards(AuthGuard, PermissionsGuard)
export class BookController {
  private readonly moduleCode = 'BkCtr-';

  constructor(
    private readonly bookService: BookService,
    private readonly cacheService: CacheService,
  ) {}

  @Public()
  @Get('search')
  async search(@Query() query: { name: string }): Promise<any> {
    return this.bookService.search(query.name);
  }

  @Public()
  @Get('details/:id')
  async getBook(@Param('id') id: string): Promise<any> {
    return this.bookService.getBook(id);
  }

  @Public()
  @Get('details/:id/related')
  async getRelatedBooks(@Param('id') id: string): Promise<any> {
    return this.bookService.getRelatedBooks(id);
  }

  @Public()
  @Get('details/:id/editions')
  async getBookEditions(@Param('id') id: string): Promise<any> {
    return this.bookService.getBookEditions(id);
  }

  @Post('refresh/:id')
  @Permissions([AquilaFlags.MEDIA_REFRESH])
  async refreshBook(@Param('id') id: string): Promise<any> {
    const cooldownKey = `cooldown:refresh:book:${id}`;
    const onCooldown = await this.cacheService.get(cooldownKey);
    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message:
          'This media was refreshed recently. Please wait before refreshing again.',
      });
    }

    const result = await this.bookService.getBook(id, true);
    await this.cacheService.set(cooldownKey, true, 60);
    return result;
  }
}
