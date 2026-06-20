import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class EmailAccountDto {
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsString()
  @IsNotEmpty()
  emailAddress: string;

  @IsString()
  @IsOptional()
  loginEmail?: string | null;

  @IsString()
  @IsOptional()
  replyToAddress?: string | null;

  @IsString()
  @IsOptional()
  organization?: string | null;

  @IsString()
  @IsOptional()
  signatureText?: string | null;

  @IsBoolean()
  @IsOptional()
  useHtmlSignature?: boolean;

  @IsString()
  @IsNotEmpty()
  imapHost: string;

  @IsInt()
  @IsNotEmpty()
  imapPort: number;

  @IsBoolean()
  @IsNotEmpty()
  imapSecure: boolean;

  @IsString()
  @IsNotEmpty()
  smtpHost: string;

  @IsInt()
  @IsNotEmpty()
  smtpPort: number;

  @IsBoolean()
  @IsNotEmpty()
  smtpSecure: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}
