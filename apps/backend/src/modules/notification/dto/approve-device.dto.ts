import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveDeviceDto {
  @IsString()
  @IsNotEmpty()
  notificationId!: string;

  @IsString()
  @IsNotEmpty()
  encryptedMasterKey!: string;
}
