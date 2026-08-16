import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { StudioRepository } from './studio.repository';
import { CacheModule } from '../../providers/cache/cache.module';
import { PrismaModule } from '../../providers/database/prisma.module';

@Module({
  imports: [CacheModule, PrismaModule],
  controllers: [StudioController],
  providers: [StudioService, StudioRepository],
  exports: [StudioService, StudioRepository],
})
export class StudioModule {}
