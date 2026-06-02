import { Module } from '@nestjs/common';

import { ListService } from './list.service';
import { ListController } from './list.controller';
import { PrismaModule } from '../../providers/database/prisma.module';
import { ConnectionModule } from '../connection/connection.module';
import { ConnectionsManager } from './connections/connections.manager';

@Module({
  imports: [PrismaModule, ConnectionModule],
  controllers: [ListController],
  providers: [
    ListService,
    ConnectionsManager,
  ],
  exports: [ListService],
})
export class ListModule {}