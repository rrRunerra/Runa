import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  rrNotFoundException,
  rrInternalServerErrorException,
} from 'src/providers/error';
import { ApiKeyCreatedEntity, ApiKeyEntity } from './entities/api-key.entity';

@Injectable()
export class ApiKeyService {
  private readonly moduleCode = 'AySve-';

  constructor(private readonly prisma: PrismaService) {}

  private generateKey(): string {
    return `${crypto.randomBytes(32).toString('hex')}`;
  }

  public async createKey(
    userId: string,
    name: string,
  ): Promise<ApiKeyCreatedEntity> {
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

  public async findAllKeysByUser(userId: string): Promise<ApiKeyEntity[]> {
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

  public async regenerateKey(
    id: string,
    userId: string,
  ): Promise<ApiKeyCreatedEntity> {
    const existing = await this.prisma.client.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}AKNF001`, {
        message: 'API Key not found',
      });
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

  public async deleteKey(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const existing = await this.prisma.client.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}AKNF001`, {
        message: 'API Key not found',
      });
    }

    try {
      await this.prisma.client.apiKey.delete({
        where: { id },
      });
    } catch (error) {
      throw new rrInternalServerErrorException(`${this.moduleCode}FTDAK001`, {
        message: 'Failed to delete API Key',
      });
    }

    return {
      message: 'API Key deleted successfully',
    };
  }
}
