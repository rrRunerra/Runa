import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(64, { message: 'Display Name must be at most 64 characters long' })
  displayName?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255, { message: 'Email must be at most 255 characters long' })
  @Matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
    message: 'Email must be lowercase and valid',
  })
  email?: string;

  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsOptional()
  @MinLength(16, { message: 'Password must be at least 16 characters long' })
  @MaxLength(64, { message: 'Password must be at most 64 characters long' })
  @Matches(/^(?=(.*[0-9]){2,})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>~'_\-+=/\\\[\]\x60]).*$/, {
    message:
      'Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
  })
  newPassword?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;
}
