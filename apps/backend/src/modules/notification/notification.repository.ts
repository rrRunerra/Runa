import { Injectable } from '@nestjs/common';

import { Prisma } from '@runa/database';

import { PrismaService } from '../../providers/database/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    userId: string,
    skip?: number,
    take?: number,
    type?: string,
    status?: string,
  ) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (type) where.type = type as Prisma.EnumNotificationTypeFilter;
    if (status) where.status = status as Prisma.EnumNotificationStatusFilter;

    return this.prisma.client.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
    });
  }

  async findFirstByIdAndUser(id: string, userId: string) {
    return this.prisma.client.notification.findFirst({
      where: { id, userId },
    });
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata: Record<string, unknown> | null;
  }) {
    return this.prisma.client.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type as Prisma.NotificationCreateInput['type'],
        status: 'PENDING',
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.client.notification.update({
      where: { id },
      data: { status: status as Prisma.NotificationUpdateInput['status'] },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.notification.delete({ where: { id } });
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.prisma.client.notification.deleteMany({ where: { userId } });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.client.notification.deleteMany({
      where: { createdAt: { lt: date } },
    });
    return result.count;
  }

  async findDeviceByIdAndUser(deviceId: string, userId: string) {
    return this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
    });
  }

  async updateDeviceMasterKey(
    deviceId: string,
    encryptedMasterKey: string,
  ): Promise<void> {
    await this.prisma.client.device.update({
      where: { id: deviceId },
      data: { encryptedMasterKey },
    });
  }
}
