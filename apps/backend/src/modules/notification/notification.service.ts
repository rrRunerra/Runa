import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  Notification,
  NotificationType,
  NotificationStatus,
  DeviceApprovalMetadata,
} from '@runa/notifications';

import {
  rrBadRequestException,
  rrNotFoundException,
} from 'src/providers/error';

import { NotificationGateway } from './notification.gateway';
import { NotificationRepository } from './notification.repository';
import { FriendsService } from '../friends/friends.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly moduleCode = 'NoSve-';

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly gateway: NotificationGateway,
    @Inject(forwardRef(() => FriendsService))
    private readonly friendsService: FriendsService,
  ) {}

  async findAll(
    userId: string,
    skip?: number,
    take?: number,
    type?: NotificationType,
    status?: NotificationStatus,
  ): Promise<Notification[]> {
    const records = await this.notificationRepository.findMany(
      userId,
      skip,
      take,
      type,
      status,
    );
    return records.map((r) => this.toEntity(r));
  }

  async create(
    userId: string,
    data: {
      title: string;
      message: string;
      type: NotificationType;
      metadata?: DeviceApprovalMetadata | Record<string, unknown>;
    },
  ): Promise<Notification> {
    const record = await this.notificationRepository.create({
      userId,
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata
        ? (JSON.parse(JSON.stringify(data.metadata)) as Record<string, unknown>)
        : null,
    });

    const notification = this.toEntity(record);
    this.gateway.sendToUser(userId, 'notification:created', notification);
    return notification;
  }

  async updateStatus(
    userId: string,
    notificationId: string,
    status: NotificationStatus,
  ): Promise<Notification> {
    const existing = await this.notificationRepository.findFirstByIdAndUser(
      notificationId,
      userId,
    );

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}NWIDNF001`, {
        message: `Notification with ID ${notificationId} not found`,
      });
    }

    if (existing.status === status) {
      return this.toEntity(existing);
    }

    const updated = await this.notificationRepository.updateStatus(
      notificationId,
      status,
    );

    // Execute side-effects for friend requests
    if (existing.status === 'PENDING' && (status === 'APPROVED' || status === 'DENIED')) {
      const metadata = existing.metadata as any;
      if (metadata && metadata.type === 'friend_request' && metadata.requestId) {
        if (status === 'APPROVED') {
          await this.friendsService.acceptRequest(metadata.requestId, userId);
        } else {
          await this.friendsService.declineRequest(metadata.requestId, userId);
        }
      }
    }

    const notification = this.toEntity(updated);
    this.gateway.sendToUser(userId, 'notification:updated', notification);
    return notification;
  }

  async approveDeviceRequest(
    userId: string,
    notificationId: string,
    encryptedMasterKey: string,
  ): Promise<Notification> {
    const existing = await this.notificationRepository.findFirstByIdAndUser(
      notificationId,
      userId,
    );

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}NWIDNF002`, {
        message: `Notification with ID ${notificationId} not found`,
      });
    }

    if (existing.type !== 'INTERACTIVE') {
      throw new rrBadRequestException(`${this.moduleCode}OINCBA001`, {
        message: 'Only interactive notifications can be approved',
      });
    }

    if (existing.status !== 'PENDING') {
      throw new rrBadRequestException(`${this.moduleCode}NIWS001`, {
        message: `Notification is already in status: ${existing.status}`,
      });
    }

    const metadata = existing.metadata as unknown as DeviceApprovalMetadata;
    if (!metadata?.deviceId) {
      throw new rrBadRequestException(`${this.moduleCode}NMMDLD001`, {
        message: 'Notification metadata is missing device linking details',
      });
    }

    const device = await this.notificationRepository.findDeviceByIdAndUser(
      metadata.deviceId,
      userId,
    );

    if (!device) {
      throw new rrNotFoundException(`${this.moduleCode}DWIDNF001`, {
        message: `Device with ID ${metadata.deviceId} not found`,
      });
    }

    await this.notificationRepository.updateDeviceMasterKey(
      metadata.deviceId,
      encryptedMasterKey,
    );

    const updated = await this.notificationRepository.updateStatus(
      notificationId,
      'APPROVED',
    );

    const notification = this.toEntity(updated);
    this.gateway.sendToUser(userId, 'notification:updated', notification);
    return notification;
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.notificationRepository.findFirstByIdAndUser(
      id,
      userId,
    );

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}NWIDNF003`, {
        message: `Notification with ID ${id} not found`,
      });
    }

    await this.notificationRepository.delete(id);
    this.gateway.sendToUser(userId, 'notification:deleted', { id });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationRepository.deleteAllByUser(userId);
    this.gateway.sendToUser(userId, 'notifications:cleared', {});
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteOldNotifications(): Promise<void> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const count = await this.notificationRepository.deleteOlderThan(oneWeekAgo);

    if (count > 0) {
      this.logger.log(
        `[Notification Cleanup] Deleted ${count} notifications older than a week.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private toEntity(record: {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    status: string;
    metadata: unknown;
    createdAt: Date;
  }): Notification {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      message: record.message,
      type: record.type as NotificationType,
      status: record.status as NotificationStatus,
      metadata: record.metadata
        ? (record.metadata as DeviceApprovalMetadata)
        : null,
      createdAt: record.createdAt,
    };
  }
}
