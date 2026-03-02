import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  private generateKey(): string {
    return `${crypto.randomBytes(32).toString('hex')}`;
  }

  async create(userId: string, name: string) {
    const rawKey = this.generateKey();
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await this.prisma.client.apiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash,
        userId,
      },
    });

    return {
      ...apiKey,
      key: rawKey, // Return raw key only once
    };
  }

  async findAll(userId: string) {
    const keys = await this.prisma.client.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      truncatedKey: `${k.keyPrefix}...`,
    }));
  }

  async regenerate(id: string, userId: string) {
    const existing = await this.prisma.client.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('API Key not found');
    }

    const rawKey = this.generateKey();
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = await bcrypt.hash(rawKey, 10);

    const updated = await this.prisma.client.apiKey.update({
      where: { id },
      data: {
        keyHash,
        keyPrefix,
        lastUsedAt: null,
      },
    });

    return {
      ...updated,
      key: rawKey,
    };
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.client.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('API Key not found');
    }

    return this.prisma.client.apiKey.delete({
      where: { id },
    });
  }
}
