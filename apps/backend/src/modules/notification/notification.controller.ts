import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';

import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { rrUnauthorizedException } from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { NotificationService } from './notification.service';
import {
  UpdateNotificationStatusDto,
  ApproveDeviceDto,
} from './notification.dto';
import type {
  NotificationEntity,
  NotificationType,
  NotificationStatus,
} from './notification.entities';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  private readonly moduleCode = 'NoCtr-';

  constructor(private readonly notificationService: NotificationService) {}

  private userId(req: ExtendedRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA001`, {
        message: 'Unauthenticated',
      });
    }
    return id;
  }

  // ---------------------------------------------------------------------------
  // GET /notifications — collection
  // ---------------------------------------------------------------------------

  @Get()
  async findAll(
    @Req() req: ExtendedRequest,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
  ): Promise<NotificationEntity[]> {
    return this.notificationService.findAll(
      this.userId(req),
      skip,
      take,
      type,
      status,
    );
  }

  // ---------------------------------------------------------------------------
  // PATCH /notifications/:id/status — singleton status update
  // ---------------------------------------------------------------------------

  @Patch(':id/status')
  async updateStatus(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
    @Body() body: UpdateNotificationStatusDto,
  ): Promise<NotificationEntity> {
    return this.notificationService.updateStatus(
      this.userId(req),
      id,
      body.status,
    );
  }

  // ---------------------------------------------------------------------------
  // POST /notifications/approve — approve device request
  // ---------------------------------------------------------------------------

  @Post('approve')
  async approveDevice(
    @Req() req: ExtendedRequest,
    @Body() body: ApproveDeviceDto,
  ): Promise<NotificationEntity> {
    return this.notificationService.approveDeviceRequest(
      this.userId(req),
      body.notificationId,
      body.encryptedMasterKey,
    );
  }

  // ---------------------------------------------------------------------------
  // DELETE /notifications/:id — singleton
  // ---------------------------------------------------------------------------

  @Delete(':id')
  async delete(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    await this.notificationService.delete(this.userId(req), id);
  }

  // ---------------------------------------------------------------------------
  // DELETE /notifications — clear collection
  // ---------------------------------------------------------------------------

  @Delete()
  async deleteAll(@Req() req: ExtendedRequest): Promise<void> {
    await this.notificationService.deleteAll(this.userId(req));
  }
}
