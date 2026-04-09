import { Module } from '@nestjs/common';
import { ListService } from './list.service';
import { ListController } from './list.controller';
import { PrismaModule } from '../../providers/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ListController],
  providers: [ListService],
  exports: [ListService],
})
export class ListModule {}
