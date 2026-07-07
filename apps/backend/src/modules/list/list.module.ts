import { Module } from '@nestjs/common';

import { ListService } from './list.service';
import { ListController } from './list.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { ConnectionModule } from '../connection/connection.module';
import { ListExternal } from './list.external';
import { StatsModule } from '../stats/stats.module';
import { MovieModule } from '../movie/movie.module';
import { TvModule } from '../tv/tv.module';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';
import { GameModule } from '../game/game.module';
import { BookModule } from '../book/book.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    ConnectionModule,
    StatsModule,
    MovieModule,
    TvModule,
    AnimeModule,
    MangaModule,
    GameModule,
    BookModule,
    NotificationModule,
  ],
  controllers: [ListController],
  providers: [
    ListService,
    { provide: 'ConnectionsManager', useClass: ListExternal },
    ListExternal,
  ],
  exports: [ListService],
})
export class ListModule {}