import { Module } from '@nestjs/common';
import { PolarisController } from './polaris.controller';
import { PolarisService } from './polaris.service';

@Module({
  controllers: [PolarisController],
  providers: [PolarisService],
  exports: [PolarisService],
})
export class PolarisModule {}
