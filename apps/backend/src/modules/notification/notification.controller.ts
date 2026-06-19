import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { UpdateNotificationStatusDto } from './dto/update-status.dto';
import { ApproveDeviceDto } from './dto/approve-device.dto';
import { Notification } from '@runa/notifications';

@Controller('notifications')
@UseGuards(DualAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Req() req: any): Promise<Notification[]> {
    const userId = req.user.id;
    return this.notificationService.findAll(userId);
  }

  @Put(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateNotificationStatusDto,
  ): Promise<Notification> {
    const userId = req.user.id;
    return this.notificationService.updateStatus(userId, id, body.status);
  }

  @Post('approve')
  async approveDevice(
    @Req() req: any,
    @Body() body: ApproveDeviceDto,
  ): Promise<Notification> {
    const userId = req.user.id;
    return this.notificationService.approveDeviceRequest(
      userId,
      body.notificationId,
      body.encryptedMasterKey,
    );
  }
}
