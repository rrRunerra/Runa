import { Module } from '@nestjs/common';

import { PrismaModule } from '../../providers/database/prisma.module';
import { ListModule } from '../list/list.module';

import { FavoriteRepository } from './favorite.repository';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';

@Module({
  imports: [PrismaModule, ListModule],
  controllers: [FavoriteController],
  providers: [FavoriteService, FavoriteRepository],
  exports: [FavoriteService],
})
export class FavoriteModule {}
