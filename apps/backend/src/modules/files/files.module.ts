import { Module } from '@nestjs/common';

import { PrismaModule } from '../../providers/database/prisma.module';

import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { LacertaCollabGateway } from './collab.gateway';
import { LacertaSharingGateway } from './sharing.gateway';
import { FilesCleanupService } from './files-cleanup.service';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    FilesRepository,
    LacertaCollabGateway,
    LacertaSharingGateway,
    FilesCleanupService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
