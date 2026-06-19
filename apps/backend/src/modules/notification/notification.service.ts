import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationGateway } from './notification.gateway';
import { Notification, NotificationType, NotificationStatus, DeviceApprovalMetadata } from '@runa/notifications';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  async findAll(userId: string): Promise<Notification[]> {
    const records = await this.prisma.client.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapToDto(record));
  }

  async create(
    userId: string,
    data: { title: string; message: string; type: NotificationType; metadata?: DeviceApprovalMetadata },
  ): Promise<Notification> {
    const record = await this.prisma.client.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        status: 'PENDING',
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
      },
    });

    const notification = this.mapToDto(record);
    this.gateway.sendToUser(userId, 'notification:created', notification);
    return notification;
  }

  async updateStatus(
    userId: string,
    notificationId: string,
    status: NotificationStatus,
  ): Promise<Notification> {
    const existing = await this.prisma.client.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    const updated = await this.prisma.client.notification.update({
      where: { id: notificationId },
      data: { status },
    });

    const notification = this.mapToDto(updated);
    this.gateway.sendToUser(userId, 'notification:updated', notification);
    return notification;
  }

  async approveDeviceRequest(
    userId: string,
    notificationId: string,
    encryptedMasterKey: string,
  ): Promise<Notification> {
    const existing = await this.prisma.client.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    if (existing.type !== 'INTERACTIVE') {
      throw new BadRequestException('Only interactive notifications can be approved');
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(`Notification is already in status: ${existing.status}`);
    }

    const metadata = existing.metadata as unknown as DeviceApprovalMetadata;
    if (!metadata || !metadata.deviceId) {
      throw new BadRequestException('Notification metadata is missing device linking details');
    }

    // Update the device with the encrypted master key
    const deviceRecord = await this.prisma.client.device.findFirst({
      where: { id: metadata.deviceId, userId },
    });

    if (!deviceRecord) {
      throw new NotFoundException(`Device with ID ${metadata.deviceId} not found`);
    }

    await this.prisma.client.device.update({
      where: { id: metadata.deviceId },
      data: { encryptedMasterKey },
    });

    // Mark notification as APPROVED
    const updatedNotification = await this.prisma.client.notification.update({
      where: { id: notificationId },
      data: { status: 'APPROVED' },
    });

    const notification = this.mapToDto(updatedNotification);
    this.gateway.sendToUser(userId, 'notification:updated', notification);
    return notification;
  }

  private mapToDto(record: any): Notification {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      message: record.message,
      type: record.type as NotificationType,
      status: record.status as NotificationStatus,
      metadata: record.metadata ? (record.metadata as unknown as DeviceApprovalMetadata) : null,
      createdAt: record.createdAt,
    };
  }
}
