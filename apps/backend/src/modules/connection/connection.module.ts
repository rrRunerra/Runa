import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { ConnectionController } from './connection.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';
import { MovieModule } from '../movie/movie.module';
import { TvModule } from '../tv/tv.module';

@Module({
  imports: [
    PrismaModule,
    AnimeModule,
    MangaModule,
    MovieModule,
    TvModule,
  ],
  controllers: [ConnectionController],
  providers: [ConnectionService],
  exports: [ConnectionService],
})
export class ConnectionModule {}
