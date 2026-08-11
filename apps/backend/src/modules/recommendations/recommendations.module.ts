import { Module } from '@nestjs/common';
import { PrismaModule } from '../../providers/database/prisma.module';
import { CacheModule } from '../../providers/cache/cache.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsRepository } from './recommendations.repository';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationsRepository],
  exports: [RecommendationsService, RecommendationsRepository],
})
export class RecommendationsModule {}
