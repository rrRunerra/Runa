import { Module } from '@nestjs/common';

import { PrismaModule } from '../../providers/database/prisma.module';

import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
