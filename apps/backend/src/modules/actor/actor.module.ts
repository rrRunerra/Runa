import { Module } from '@nestjs/common';
import { ActorController } from './actor.controller';
import { ActorService } from './actor.service';
import { ActorRepository } from './actor.repository';

@Module({
  controllers: [ActorController],
  providers: [ActorService, ActorRepository],
  exports: [ActorService],
})
export class ActorModule {}
