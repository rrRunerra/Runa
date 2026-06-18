import { Module } from '@nestjs/common';

import { ListService } from './list.service';
import { ListController } from './list.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { ConnectionModule } from '../connection/connection.module';
import { ConnectionsManager } from './connections/connections.manager';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [PrismaModule, ConnectionModule, StatsModule],
  controllers: [ListController],
  providers: [
    ListService,
    ConnectionsManager,
  ],
  exports: [ListService],
})
export class ListModule {}