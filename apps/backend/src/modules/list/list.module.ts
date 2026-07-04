import { Module } from '@nestjs/common';

import { ListService } from './list.service';
import { ListController } from './list.controller';
import { RadarrSonarrController } from './radarr-sonarr.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { ConnectionModule } from '../connection/connection.module';
import { ListExternal } from './list.external';
import { StatsModule } from '../stats/stats.module';
import { MovieModule } from '../movie/movie.module';
import { TvModule } from '../tv/tv.module';

@Module({
  imports: [PrismaModule, ConnectionModule, StatsModule, MovieModule, TvModule],
  controllers: [ListController, RadarrSonarrController],
  providers: [
    ListService,
    { provide: 'ConnectionsManager', useClass: ListExternal },
    ListExternal,
  ],
  exports: [ListService],
})
export class ListModule {}