import { Module, forwardRef } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameQueueService } from './game-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { GameExternal } from './game.external';
import { WikidataService } from 'src/providers/Wikidata/wikidata.service';
import { RawgService } from 'src/providers/Rawg/rawg.service';
import { IgdbService } from 'src/providers/Igdb/igdb.service';
import { SteamService } from 'src/providers/Steam/steam.service';
import { AnimeModule } from '../anime/anime.module';
import { MangaModule } from '../manga/manga.module';
import { MovieModule } from '../movie/movie.module';
import { BookModule } from '../book/book.module';

@Module({
  imports: [
    forwardRef(() => AnimeModule),
    forwardRef(() => MangaModule),
    forwardRef(() => MovieModule),
    forwardRef(() => BookModule),
  ],
  controllers: [GameController],
  providers: [
    GameService,
    GameRepository,
    GameQueueService,
    CacheService,
    GameExternal,
    WikidataService,
    RawgService,
    IgdbService,
    SteamService,
  ],
  exports: [GameService, GameRepository, GameQueueService, WikidataService, RawgService, IgdbService, SteamService],
})
export class GameModule {}
