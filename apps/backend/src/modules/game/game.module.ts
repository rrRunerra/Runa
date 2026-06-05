import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameRepository } from './repositories/game.repository';
import { GameQueueService } from './services/game-queue.service';

@Module({
  controllers: [GameController],
  providers: [GameService, GameRepository, GameQueueService],
  exports: [GameService, GameRepository, GameQueueService],
})
export class GameModule {}
