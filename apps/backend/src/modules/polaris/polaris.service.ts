import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Injectable()
export class PolarisService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateBookmark(userId: string, dto: CreateBookmarkDto) {
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
      },
    });
  }

  async getBookmarks(userId: string) {
    return this.prisma.client.polarisUserBookMarks.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBookmark(userId: string, id: string) {
    const bookmark = await this.prisma.client.polarisUserBookMarks.findFirst({
      where: { id, userId },
    });
    
    if (!bookmark) {
      throw new NotFoundException(`Bookmark with ID ${id} not found`);
    }

    await this.prisma.client.polarisUserBookMarks.delete({
      where: { id },
    });
    
    return { success: true };
  }
}
