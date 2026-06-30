import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { rrNotFoundException } from 'src/providers/error';

@Injectable()
export class PolarisService {
  private readonly moduleCode = 'PoSve-';

  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateBookmark(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<any> {
    const existing = await this.prisma.client.polarisUserBookMarks.findFirst({
      where: {
        userId,
        name: dto.name,
      },
    });

    if (existing) {
      return this.prisma.client.polarisUserBookMarks.update({
        where: { id: existing.id },
        data: {
          description: dto.description,
          redirect: dto.redirect,
          stars: dto.stars as any,
          connections: dto.connections as any,
          icon: dto.icon || null,
          connectionColor: dto.connectionColor || null,
          starColor: dto.starColor || null,
        },
      });
    }

    return this.prisma.client.polarisUserBookMarks.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        redirect: dto.redirect,
        stars: dto.stars as any,
        connections: dto.connections as any,
        icon: dto.icon || null,
        connectionColor: dto.connectionColor || null,
        starColor: dto.starColor || null,
      },
    });
  }

  async getBookmarks(userId: string): Promise<any[]> {
    return this.prisma.client.polarisUserBookMarks.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBookmark(
    userId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const bookmark = await this.prisma.client.polarisUserBookMarks.findFirst({
      where: { id, userId },
    });

    if (!bookmark) {
      throw new rrNotFoundException(`${this.moduleCode}BWIDNF001`, {
        message: `Bookmark with ID ${id} not found`,
      });
    }

    await this.prisma.client.polarisUserBookMarks.delete({
      where: { id },
    });

    return { success: true };
  }
}
