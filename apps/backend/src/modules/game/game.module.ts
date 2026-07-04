import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from './game.repository';
import { GameQueueService } from './game-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { GameExternal } from './game.external';

@Module({
  controllers: [GameController],
  providers: [
    GameService,
    GameRepository,
    GameQueueService,
    CacheService,
    GameExternal,
  ],
  exports: [GameService],
})
export class GameModule {}
