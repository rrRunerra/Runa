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
    name: string;
    size?: number;
    type?: string;
    parentId?: string;
    isFolder?: boolean;
    isVault?: boolean;
  }): Promise<LaceraFile> {
    return this.prisma.client.laceraFile.create({ data });
  }

  async findLaceraFileById(id: string) {
    return this.prisma.client.laceraFile.findUnique({
      where: { id },
      include: { shares: true },
    });
  }

  async findLaceraFileByKey(key: string) {
    return this.prisma.client.laceraFile.findUnique({
      where: { key },
      include: {
        shares: {
          select: { userId: true, wrappedKey: true },
        },
      },
    });
  }

  async listLaceraFiles(userId: string) {
    return this.prisma.client.laceraFile.findMany({
      where: {
        OR: [
          { userId },
          { shares: { some: { userId } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            userPublicKey: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            createdAt: true,
          },
        },
        shares: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                userPublicKey: true,
                displayName: true,
                avatarUrl: true,
                bannerUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLaceraMetadata(
    id: string,
    data: {
      name?: string;
      parentId?: string | null;
      isTrash?: boolean;
      isVault?: boolean;
      isPublic?: boolean;
      size?: number | null;
    },
  ): Promise<LaceraFile> {
    return this.prisma.client.laceraFile.update({
      where: { id },
      data,
    });
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

  async createLaceraShare(data: {
    fileId: string;
    userId: string;
    wrappedKey: string;
    allowEdit?: boolean;
  }) {
    return this.prisma.client.laceraShare.create({ data });
  }

  async deleteLaceraShare(fileId: string, userId: string) {
    return this.prisma.client.laceraShare.deleteMany({
      where: { fileId, userId },
    });
  }

  async deleteLaceraFileById(id: string): Promise<LaceraFile> {
    return this.prisma.client.laceraFile.delete({
      where: { id },
    });
  }

  async deleteLaceraFileByKey(key: string): Promise<void> {
    await this.prisma.client.laceraFile.deleteMany({ where: { key } });
  }

  async findLaceraDescendants(parentId: string): Promise<LaceraFile[]> {
    const descendants: LaceraFile[] = [];
    const queue = [parentId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.client.laceraFile.findMany({
        where: { parentId: currentId },
      });
      for (const child of children) {
        descendants.push(child);
        if (child.isFolder) {
          queue.push(child.id);
        }
      }
    }
    return descendants;
  }

  async updateLaceraFilesTrashState(ids: string[], isTrash: boolean) {
    return this.prisma.client.laceraFile.updateMany({
      where: { id: { in: ids } },
      data: { isTrash },
    });
  }

  async findUserVaultPinHash(userId: string): Promise<string | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { vaultPinHash: true },
    });
    return user?.vaultPinHash ?? null;
  }

  async updateUserVaultPinHash(userId: string, hash: string | null): Promise<void> {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { vaultPinHash: hash },
    });
  }

  async deleteUserVaultFiles(userId: string): Promise<void> {
    await this.prisma.client.laceraFile.deleteMany({
      where: {
        userId,
        isVault: true,
      },
    });
  }

  async findUserVaultFiles(userId: string): Promise<{ key: string; isFolder: boolean }[]> {
    return this.prisma.client.laceraFile.findMany({
      where: { userId, isVault: true },
      select: { key: true, isFolder: true },
    });
  }
}
