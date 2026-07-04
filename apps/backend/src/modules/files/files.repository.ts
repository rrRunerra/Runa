import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../providers/database/prisma.service';
import type { LaceraFile } from '@runa/database';

@Injectable()
export class FilesRepository {
  private readonly moduleCode = 'FsRpsty-';

  constructor(private readonly prisma: PrismaService) {}

  async createLaceraFile(data: {
    key: string;
    userId: string;
    wrappedKey: string;
  }): Promise<LaceraFile> {
    return this.prisma.client.laceraFile.create({ data });
  }

  async findLaceraFileByKey(key: string): Promise<LaceraFile | null> {
    return this.prisma.client.laceraFile.findUnique({ where: { key } });
  }

  async updateLaceraVisibility(
    key: string,
    isPublic: boolean,
  ): Promise<LaceraFile> {
    return this.prisma.client.laceraFile.update({
      where: { key },
      data: { isPublic },
    });
  }

  async deleteLaceraFileByKey(key: string): Promise<void> {
    await this.prisma.client.laceraFile.deleteMany({ where: { key } });
  }
}
