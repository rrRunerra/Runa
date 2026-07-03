import { IsIn, IsNotEmpty, IsString } from 'class-validator';

import type { NotificationStatus } from '@runa/notifications';

export class UpdateNotificationStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['PENDING', 'APPROVED', 'DENIED', 'READ'], {
    message: 'status must be one of: PENDING, APPROVED, DENIED, READ',
  })
  status!: NotificationStatus;
}

export class ApproveDeviceDto {
  @IsString()
  @IsNotEmpty()
  notificationId!: string;

  @IsString()
  @IsNotEmpty()
  encryptedMasterKey!: string;
}
