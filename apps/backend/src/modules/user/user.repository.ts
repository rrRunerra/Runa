import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type User,
  type Connections,
  type Device,
  type Passkey,
  type ApiKey,
} from '@runa/database';

import { PrismaService } from '../../providers/database/prisma.service';

import type { PrivacySettings, RegisterDeviceData } from './user.types';
import type {
  DeviceEntity,
  PasskeyEntity,
  DeviceStatusEntity,
  EncryptionKeysEntity,
} from './user.entities';
import type { PrivacySettingsDto } from './user.dto';

@Injectable()
export class UserRepository {
  private readonly moduleCode = 'UrRpsty-';

  constructor(private readonly prisma: PrismaService) {}

  // --- User Lookups ---

  async countUsers(): Promise<number> {
    return this.prisma.client.user.count();
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
    });
  }

  async findUserWithPasskeysById(
    id: string,
  ): Promise<(User & { passkeys: Passkey[] }) | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
      include: { passkeys: true },
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  async findUserByUsernameWithConnections(
    username: string,
  ): Promise<(User & { connections: Connections[] }) | null> {
    return this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { connections: true },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findFirstUserByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<User | null> {
    return this.prisma.client.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
  }

  // --- User Mutations ---

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({ data });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.client.user.update({
      where: { id },
      data,
    });
  }

  // --- Privacy ---

  async updatePrivacySettings(
    userId: string,
    username: string,
    privacy: PrivacySettings,
    dto: PrivacySettingsDto,
  ): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { privacy: privacy as unknown as Prisma.JsonObject },
      }),
      ...(dto.animeList !== undefined
        ? [
            this.prisma.client.aquilaAnimeUserListV2.updateMany({
              where: { username },
              data: { private: dto.animeList },
            }),
          ]
        : []),
      ...(dto.mangaList !== undefined
        ? [
            this.prisma.client.aquilaMangaUserListV2.updateMany({
              where: { username },
              data: { private: dto.mangaList },
            }),
          ]
        : []),
      ...(dto.tvList !== undefined
        ? [
            this.prisma.client.aquilaTvUserListV2.updateMany({
              where: { username },
              data: { private: dto.tvList },
            }),
          ]
        : []),
      ...(dto.movieList !== undefined
        ? [
            this.prisma.client.aquilaMovieUserListV2.updateMany({
              where: { username },
              data: { private: dto.movieList },
            }),
          ]
        : []),
      ...(dto.gameList !== undefined
        ? [
            this.prisma.client.aquilaGameUserListV2.updateMany({
              where: { username },
              data: { private: dto.gameList },
            }),
          ]
        : []),
      ...(dto.bookList !== undefined
        ? [
            this.prisma.client.aquilaBookUserListV2.updateMany({
              where: { username },
              data: { private: dto.bookList },
            }),
          ]
        : []),
      ...(dto.connections !== undefined
        ? [
            this.prisma.client.connections.updateMany({
              where: { username },
              data: { private: dto.connections },
            }),
          ]
        : []),
    ]);
  }

  // --- Passkeys ---

  async findPasskeysByUserId(userId: string): Promise<PasskeyEntity[]> {
    return this.prisma.client.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async findPasskeyById(passkeyId: string): Promise<Passkey | null> {
    return this.prisma.client.passkey.findUnique({
      where: { id: passkeyId },
    });
  }

  async createPasskey(
    data: Prisma.PasskeyCreateInput,
    userId: string,
    backupCodes?: string[],
  ): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.passkey.create({ data }),
      ...(backupCodes && backupCodes.length > 0
        ? [
            this.prisma.client.user.update({
              where: { id: userId },
              data: { backupCodes },
            }),
          ]
        : []),
    ]);
  }

  async deletePasskey(
    passkeyId: string,
    userId: string,
    clearBackupCodes: boolean,
  ): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.passkey.delete({ where: { id: passkeyId } }),
      ...(clearBackupCodes
        ? [
            this.prisma.client.user.update({
              where: { id: userId },
              data: { backupCodes: [] },
            }),
          ]
        : []),
    ]);
  }

  // --- Devices ---

  async findDevicesByUserId(userId: string): Promise<DeviceEntity[]> {
    return this.prisma.client.device.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        lastActiveAt: true,
        identityKey: true,
        mlKemIdentityKey: true,
        signedPreKey: true,
        encryptedMasterKey: true,
      },
    });
  }

  async findDeviceById(
    deviceId: string,
    userId: string,
  ): Promise<Device | null> {
    return this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
    });
  }

  async findDeviceByIdentityKey(
    identityKey: string,
    userId: string,
  ): Promise<Device | null> {
    return this.prisma.client.device.findFirst({
      where: { identityKey, userId },
    });
  }

  async findOtherDevicesByUserId(
    userId: string,
    excludeId: string,
  ): Promise<Device[]> {
    return this.prisma.client.device.findMany({
      where: { userId, id: { not: excludeId } },
    });
  }

  async getDeviceStatus(
    userId: string,
    deviceId: string,
  ): Promise<DeviceStatusEntity | null> {
    const device = await this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
      select: { id: true, encryptedMasterKey: true },
    });

    if (!device) return null;

    return {
      id: device.id,
      approved: device.encryptedMasterKey !== null,
      encryptedMasterKey: device.encryptedMasterKey,
    };
  }

  async createDevice(data: Prisma.DeviceUncheckedCreateInput): Promise<Device> {
    return this.prisma.client.device.create({ data });
  }

  async updateDevice(
    deviceId: string,
    data: Prisma.DeviceUpdateInput,
  ): Promise<Device> {
    return this.prisma.client.device.update({
      where: { id: deviceId },
      data,
    });
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.prisma.client.device.delete({
      where: { id: deviceId },
    });
  }

  async createPreKeys(deviceId: string, keys: string[]): Promise<void> {
    await this.prisma.client.preKey.createMany({
      data: keys.map((key) => ({ deviceId, key })),
    });
  }

  async createDeviceLinkNotification(
    userId: string,
    deviceId: string,
    deviceName: string,
    identityKey: string,
    mlKemIdentityKey?: string | null,
  ): Promise<void> {
    await this.prisma.client.notification.create({
      data: {
        userId,
        title: 'New Device Link Request',
        message: `A new device "${deviceName}" wants to link to your account.`,
        type: 'INTERACTIVE',
        status: 'PENDING',
        metadata: {
          deviceId,
          deviceName,
          publicKey: identityKey,
          mlKemPublicKey: mlKemIdentityKey || null,
        } as Prisma.JsonObject,
      },
    });
  }

  // --- Encryption Keys ---

  async getEncryptionKeys(userId: string): Promise<EncryptionKeysEntity | null> {
    return this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        userPublicKey: true,
        userMlKemPublicKey: true,
        encryptedUserPrivateKey: true,
      },
    });
  }

  async updateEncryptionKeys(
    userId: string,
    userPublicKey: string,
    userMlKemPublicKey: string,
    encryptedUserPrivateKey: string,
  ): Promise<User> {
    return this.prisma.client.user.update({
      where: { id: userId },
      data: { userPublicKey, userMlKemPublicKey, encryptedUserPrivateKey },
    });
  }

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------

  async findApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return this.prisma.client.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findApiKeyByIdAndUser(
    id: string,
    userId: string,
  ): Promise<ApiKey | null> {
    return this.prisma.client.apiKey.findFirst({
      where: { id, userId },
    });
  }

  async createApiKey(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
    return this.prisma.client.apiKey.create({ data });
  }

  async updateApiKey(
    id: string,
    data: Prisma.ApiKeyUpdateInput,
  ): Promise<ApiKey> {
    return this.prisma.client.apiKey.update({
      where: { id },
      data,
    });
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.prisma.client.apiKey.delete({
      where: { id },
    });
  }

  async searchUsers(
    currentUserId: string,
    query: string,
  ): Promise<
    {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      bannerUrl: string | null;
      email: string;
      createdAt: Date;
      userPublicKey: string | null;
    }[]
  > {
    return this.prisma.client.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query.toLowerCase(), mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        email: true,
        createdAt: true,
        userPublicKey: true,
      },
      take: 10,
    });
  }
}
