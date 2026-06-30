import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { UpdateNotificationStatusDto } from './dto/update-status.dto';
import { ApproveDeviceDto } from './dto/approve-device.dto';
import { Notification } from '@runa/notifications';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  private readonly moduleCode = 'NoCtr-';

  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ): Promise<Notification[]> {
    const userId = req.user.id;
    return this.notificationService.findAll(
      userId,
      skip,
      take,
      type as any,
      status as any,
    );
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

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    const userId = req.user.id;
    await this.notificationService.delete(userId, id);
  }

  @Delete()
  async deleteAll(@Req() req: any): Promise<void> {
    const userId = req.user.id;
    await this.notificationService.deleteAll(userId);
  }
}
