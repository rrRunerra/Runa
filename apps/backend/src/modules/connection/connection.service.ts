import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { ConnectionLinkedTo, ConnectionProvider } from '@runa/database';

@Injectable()
export class ConnectionService {
  constructor(private readonly prisma: PrismaService) {}

  private toProvider(value: string): ConnectionProvider {
    const upper = value.toUpperCase() as ConnectionProvider;
    if (!Object.values(ConnectionProvider).includes(upper)) {
      throw new BadRequestException(`Invalid provider: ${value}`);
    }
    return upper;
  }

  async findAll(userId: string, linkedTo?: ConnectionLinkedTo) {
    return this.prisma.client.connections.findMany({
      where: {
        userId,
        linkedTo: linkedTo ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        username: true,
        connectionId: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });
  }

  async upsert(
    userId: string,
    data: {
      provider: string;
      username?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      connectionId?: string;
      linkedTo?: ConnectionLinkedTo;
    },
  ) {
    const provider = this.toProvider(data.provider);

    const connection = await this.prisma.client.connections.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: {
        username: data.username,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
      },
      create: {
        userId,
        provider,
        username: data.username,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
      },
    });

    return {
      id: connection.id,
      provider: connection.provider,
      username: connection.username,
      connectionId: connection.connectionId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      expiresAt: connection.expiresAt,
      linkedTo: connection.linkedTo,
    };
  }

  async remove(userId: string, providerRaw: string) {
    const provider = this.toProvider(providerRaw);

    const existing = await this.prisma.client.connections.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    });

    if (!existing) {
      throw new NotFoundException('Connection not found');
    }

    await this.prisma.client.connections.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }
}
