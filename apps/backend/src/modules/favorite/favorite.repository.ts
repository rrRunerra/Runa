import { Injectable } from '@nestjs/common';

import { Favorite, FavoriteType } from '@runa/database';

import { PrismaService } from '../../providers/database/prisma.service';

@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<Favorite | null> {
    return this.prisma.client.favorite.findUnique({
      where: { userId_type_mediaId: { userId, type, mediaId: targetId } },
    });
  }

  async create(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<Favorite> {
    return this.prisma.client.favorite.create({
      data: { userId, type, mediaId: targetId },
    });
  }

  async delete(
    userId: string,
    type: FavoriteType,
    targetId: string,
  ): Promise<void> {
    await this.prisma.client.favorite.delete({
      where: { userId_type_mediaId: { userId, type, mediaId: targetId } },
    });
  }

  async findManyByUserId(
    userId: string,
    type?: FavoriteType,
  ): Promise<Favorite[]> {
    return this.prisma.client.favorite.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserByUsername(username: string) {
    return this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
  }

  async resolveMedia(type: FavoriteType, mediaId: string) {
    const num = Number(mediaId);

    switch (type) {
      case FavoriteType.ANIME:
        return this.prisma.client.aquilaAnime.findUnique({
          where: { id: num },
          select: {
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
          },
        });
      case FavoriteType.MANGA:
        return this.prisma.client.aquilaManga.findUnique({
          where: { id: num },
          select: {
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
          },
        });
      case FavoriteType.TV:
        return this.prisma.client.aquilaTv.findUnique({
          where: { id: num },
          select: { titleEnglish: true, coverImage: true },
        });
      case FavoriteType.MOVIE:
        return this.prisma.client.aquilaMovie.findUnique({
          where: { id: num },
          select: { titleEnglish: true, coverImage: true },
        });
      case FavoriteType.GAME:
        return this.prisma.client.aquilaGame.findUnique({
          where: { id: num },
          select: { titleString: true, coverImage: true },
        });
      case FavoriteType.BOOK:
        return this.prisma.client.aquilaBook.findUnique({
          where: { id: num },
          select: { titleString: true, coverImage: true },
        });
      case FavoriteType.USER:
        return this.prisma.client.user.findUnique({
          where: { id: mediaId },
          select: { username: true, displayName: true, avatarUrl: true },
        });
      case FavoriteType.CHARACTER:
        return this.prisma.client.aquilaCharacter.findUnique({
          where: { id: num },
          select: {
            nameFirst: true,
            nameMiddle: true,
            nameLast: true,
            nameNative: true,
            image: true,
          },
        });
      case FavoriteType.STAFF:
        return this.prisma.client.aquilaActor.findUnique({
          where: { id: num },
          select: {
            name: true,
            personName: true,
            image: true,
          },
        });
      default:
        return null;
    }
  }
}
