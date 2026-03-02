import {
  MinLength,
  MaxLength,
  Matches,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class LoginAuthDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @MinLength(16, { message: 'Password must be at least 16 characters long' })
  @MaxLength(64, { message: 'Password must be at most 64 characters long' })
  @Matches(/^(?=(.*[0-9]){2,})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/, {
    message:
      'Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
  })
  password!: string;
}
