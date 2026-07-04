import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { NotificationStatus } from '@runa/notifications';

export class UpdateNotificationStatusDto {
  @IsString({ message: 'UeNnSodto-SMBAS001: Status must be a string' })
  @IsNotEmpty({ message: 'UeNnSodto-SMNBE001: Status must not be empty' })
  @IsIn(['PENDING', 'APPROVED', 'DENIED', 'READ'], {
    message: 'UeNnSodto-SMBOTO001: Status must be one of PENDING, APPROVED, DENIED, READ',
  })
  status!: NotificationStatus;
}

export class ApproveDeviceDto {
  @IsString({ message: 'AeDvdto-NIMBAS001: Notification id must be a string' })
  @IsNotEmpty({ message: 'AeDvdto-NIMNBE001: Notification id must not be empty' })
  notificationId!: string;

  @IsString({ message: 'AeDvdto-EMKMBAS001: Encrypted master key must be a string' })
  @IsNotEmpty({ message: 'AeDvdto-EMKMNBE001: Encrypted master key must not be empty' })
  encryptedMasterKey!: string;
}
