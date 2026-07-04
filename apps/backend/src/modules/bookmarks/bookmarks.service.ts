import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { CreateBookmarkDto } from './bookmarks.dto';
import { rrNotFoundException } from 'src/providers/error';
import BookmarkEntity from './bookmarks.entities';

@Injectable()
export class BookmarksService {
  private readonly moduleCode = 'BsSve-';
  private readonly logger = new Logger(BookmarksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async createOrUpdateBookmark(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<BookmarkEntity> {
    const existing = await this.prisma.client.polarisUserBookMarks.findFirst({
      where: {
        userId,
        name: dto.name,
      },
    });

    let result: BookmarkEntity;

    if (existing) {
      result = await this.prisma.client.polarisUserBookMarks.update({
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
      }) as unknown as BookmarkEntity;
    } else {
      result = await this.prisma.client.polarisUserBookMarks.create({
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
      }) as unknown as BookmarkEntity;
    }

    // Bust bookmarks cache for user
    await this.cache.del(CacheService.keys.bookmarksUser(userId));

    return result;
  }

  async getBookmarks(userId: string): Promise<BookmarkEntity[]> {
    const cacheKey = CacheService.keys.bookmarksUser(userId);
    const cached = await this.cache.get<BookmarkEntity[]>(cacheKey);
    if (cached) return cached;

    const bookmarks = await this.prisma.client.polarisUserBookMarks.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as unknown as BookmarkEntity[];

    await this.cache.set(cacheKey, bookmarks, 300); // 5 min TTL
    return bookmarks;
  }

  async deleteBookmark(
    userId: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const bookmark = await this.prisma.client.polarisUserBookMarks.findFirst({
      where: { id, userId },
    });

    if (!bookmark) {
      throw new rrNotFoundException(`${this.moduleCode}BWNF001`, {
        message: `Bookmark with ID ${id} not found`,
      });
    }

    await this.prisma.client.polarisUserBookMarks.delete({
      where: { id },
    });

    // Bust bookmarks cache for user
    await this.cache.del(CacheService.keys.bookmarksUser(userId));

    return { success: true };
  }
}
