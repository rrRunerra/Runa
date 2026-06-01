import { Module } from '@nestjs/common';

import { ListService } from './list.service';
import { ListController } from './list.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { AnilistConnectionService } from './connections/anilist-connection.service';
import { MalConnectionService } from './connections/mal-connection.service';
import { ConnectionsManager } from './connections/connections.manager';

@Module({
  imports: [PrismaModule],
  controllers: [ListController],
  providers: [
    ListService,
    AnilistConnectionService,
    MalConnectionService,
    ConnectionsManager,
  ],
  exports: [ListService],
})
export class ListModule {}
