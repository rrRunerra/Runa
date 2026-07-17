import { Module } from '@nestjs/common';
import { MediaUpdateService } from './media-update.service';
import { MediaUpdateController } from './media-update.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';
import { BookModule } from '../book/book.module';
import { GameModule } from '../game/game.module';
import { MovieModule } from '../movie/movie.module';
import { TvModule } from '../tv/tv.module';

@Module({
  imports: [
    PrismaModule,
    AnimeModule,
    MangaModule,
    BookModule,
    GameModule,
    MovieModule,
    TvModule,
  ],
  controllers: [MediaUpdateController],
  providers: [MediaUpdateService],
  exports: [MediaUpdateService],
})
export class MediaUpdateModule {}
