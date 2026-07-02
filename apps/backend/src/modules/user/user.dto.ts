import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

// --- User Creation ---

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
  @Matches(
    /^(?=(?:.*[0-9]){2})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]\x60]).*$/,
    {
      message:
        'Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
    },
  )
  password!: string;
}

// --- User Update ---

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
  @Matches(
    /^(?=(?:.*[0-9]){2})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]\x60]).*$/,
    {
      message:
        'Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
    },
  )
  newPassword?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsString()
  @IsOptional()
  sidebarCardBackgroundUrl?: string;
}

// --- Privacy Settings ---

export class PrivacySettingsDto {
  @IsBoolean()
  @IsOptional()
  profile?: boolean;

  @IsBoolean()
  @IsOptional()
  animeList?: boolean;

  @IsBoolean()
  @IsOptional()
  mangaList?: boolean;

  @IsBoolean()
  @IsOptional()
  tvList?: boolean;

  @IsBoolean()
  @IsOptional()
  movieList?: boolean;

  @IsBoolean()
  @IsOptional()
  connections?: boolean;
}

// --- Profile Settings ---

export class UpdateSettingsDto {
  @IsObject()
  @IsNotEmpty()
  profileSettings!: Record<string, string | number | boolean | null>;
}

// --- MFA: TOTP ---

export class EnableTotpDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

// --- MFA: Email ---

export class EnableEmailMfaDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

// --- MFA: Passkey ---

export class VerifyPasskeyDto {
  @IsObject()
  @IsNotEmpty()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response!: Record<string, any>;

  @IsString()
  @IsOptional()
  name?: string;
}

// --- Device Registration ---

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceName!: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsNotEmpty()
  identityKey!: string;

  @IsString()
  @IsNotEmpty()
  signedPreKey!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preKeys?: string[];
}

// --- Param DTOs ---

export class IdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class EmailParamDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class UsernameParamDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
}
