import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Req,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { CreateBookmarkDto } from './bookmarks.dto';

@Controller('bookmarks')
@UseGuards(AuthGuard)
export class BookmarksController {
  private readonly moduleCode = 'BsCtr-';

  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post()
  async createOrUpdateBookmark(
    @Req() req: any,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createOrUpdateBookmark(req.user.id, dto);
  }

  @Get()
  async getBookmarks(@Req() req: any) {
    return this.bookmarksService.getBookmarks(req.user.id);
  }

  @Delete(':id')
  async deleteBookmark(@Req() req: any, @Param('id') id: string) {
    return this.bookmarksService.deleteBookmark(req.user.id, id);
  }
}
