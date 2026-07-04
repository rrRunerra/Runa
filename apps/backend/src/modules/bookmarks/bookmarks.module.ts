import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { CacheModule } from '../../providers/cache/cache.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [CacheModule, NotificationModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
