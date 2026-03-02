import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255, { message: 'Email must be at most 255 characters long' })
  @Matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
    message: 'Email must be lowercase and valid',
  })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(32, { message: 'Username must be at most 32 characters long' })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @IsString()
  @MinLength(16, { message: 'Password must be at least 16 characters long' })
  @MaxLength(64, { message: 'Password must be at most 64 characters long' })
  @Matches(/^(?=(.*[0-9]){2,})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/, {
    message:
      'Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
  })
  password!: string;
}
