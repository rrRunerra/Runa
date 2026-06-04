import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { ConnectionLinkedTo, ConnectionProvider } from '@runa/database';
import { ConnectionLoader, ConnectionCapability } from '@runa/connections';

@Injectable()
export class ConnectionService implements OnModuleInit {
  private loader: ConnectionLoader;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.loader = new ConnectionLoader({
      prisma: this.prisma,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', // DevSkim: ignore DS137138, DS162092
      env: process.env,
    });

    await this.loader.loadConnections();
  }

  private toProvider(value: string): ConnectionProvider {
    const upper = value.toUpperCase() as ConnectionProvider;
    if (!Object.values(ConnectionProvider).includes(upper)) {
      throw new BadRequestException(`Invalid provider: ${value}`);
    }
    return upper;
  }

  public getConnectionInstance(providerId: string) {
    const provider = this.loader.getConnection(this.toProvider(providerId));
    if (!provider) {
      throw new BadRequestException(`Invalid provider: ${providerId}`);
    }
    if (!provider.isEnabled) {
      throw new BadRequestException('ENV MISSING CHECK CONSOLE');
    }
    return provider;
  }

  async getAuthUrl(providerId: string, token: string, redirectUrl?: string) {
    const provider = this.getConnectionInstance(providerId);
    return provider.getAuthUrl(token, redirectUrl);
  }

  async handleCallback(providerId: string, code: string, username: string) {
    const provider = this.getConnectionInstance(providerId);
    return provider.handleCallback(code, username);
  }

  async findAll(username: string, linkedTo?: ConnectionLinkedTo, capabilities?: string | string[]) {
    const connections = await this.prisma.client.connections.findMany({
      where: {
        username,
        linkedTo: linkedTo ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        linkedUsername: true,
        connectionId: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        linkedTo: true,
        private: true,
        metadata: true,
      },
    });

    let capabilitiesFilter: ConnectionCapability[] | undefined;
    if (capabilities) {
      const rawCaps = Array.isArray(capabilities)
        ? capabilities
        : typeof capabilities === 'string'
        ? capabilities.split(',')
        : [];
      capabilitiesFilter = rawCaps
        .map((cap) => cap.trim().toUpperCase() as ConnectionCapability)
        .filter((cap) => Object.values(ConnectionCapability).includes(cap as ConnectionCapability));
    }

    if (capabilitiesFilter && capabilitiesFilter.length > 0) {
      return connections.filter((conn) => {
        try {
          const providerInstance = this.loader.getConnection(conn.provider);
          if (!providerInstance) return false;
          return providerInstance.capabilities.some((cap) =>
            capabilitiesFilter!.includes(cap)
          );
        } catch {
          return false;
        }
      });
    }

    return connections;
  }

  async upsert(
    username: string,
    data: {
      provider: string;
      linkedUsername?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      connectionId?: string;
      linkedTo?: ConnectionLinkedTo;
      private?: boolean;
      metadata?: any;
    },
  ) {
    const provider = this.toProvider(data.provider);

    const connection = await this.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider },
      },
      update: {
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
        private: data.private,
        metadata: data.metadata,
      },
      create: {
        username,
        provider,
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
        private: data.private,
        metadata: data.metadata,
      },
    });

    return {
      id: connection.id,
      provider: connection.provider,
      linkedUsername: connection.linkedUsername,
      connectionId: connection.connectionId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      expiresAt: connection.expiresAt,
      linkedTo: connection.linkedTo,
      private: connection.private,
      metadata: connection.metadata,
    };
  }

  async remove(username: string, providerRaw: string) {
    const provider = this.toProvider(providerRaw);

    const existing = await this.prisma.client.connections.findUnique({
      where: {
        username_provider: { username, provider },
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
