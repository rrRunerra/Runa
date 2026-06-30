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
import { PolarisService } from './polaris.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Controller('polaris/bookmarks')
@UseGuards(AuthGuard)
export class PolarisController {
  private readonly moduleCode = 'PoCtr-';

  constructor(private readonly polarisService: PolarisService) {}

  @Post()
  async createOrUpdateBookmark(
    @Req() req: any,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.polarisService.createOrUpdateBookmark(req.user.id, dto);
  }

  @Get()
  async getBookmarks(@Req() req: any) {
    return this.polarisService.getBookmarks(req.user.id);
  }

  @Delete(':id')
  async deleteBookmark(@Req() req: any, @Param('id') id: string) {
    return this.polarisService.deleteBookmark(req.user.id, id);
  }
}
