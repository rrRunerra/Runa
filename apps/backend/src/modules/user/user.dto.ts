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
  IsUUID,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

// --- User Creation ---

export class CreateUserDto {
  @IsEmail({}, { message: 'CeUrdto-EMBAVE001: Email must be a valid email' })
  @IsNotEmpty({ message: 'CeUrdto-EMNBE001: Email must not be empty' })
  @MaxLength(255, {
    message: 'CeUrdto-EMBALTC001: Email must be at most 255 characters long',
  })
  @Matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
    message: 'CeUrdto-EMBMLAV001: Email must be lowercase and valid',
  })
  email!: string;

  @IsString({ message: 'CeUrdto-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'CeUrdto-UMNBE001: Username must not be empty' })
  @MinLength(3, {
    message: 'CeUrdto-UMBALTC001: Username must be at least 3 characters long',
  })
  @MaxLength(32, {
    message: 'CeUrdto-UMBALTC002: Username must be at most 32 characters long',
  })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'CeUrdto-UMMOCLLNAU001: Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @IsString({ message: 'CeUrdto-PMBAS001: Password must be a string' })
  @MinLength(16, {
    message: 'CeUrdto-PMBALTC001: Password must be at least 16 characters long',
  })
  @MaxLength(64, {
    message: 'CeUrdto-PMBALTC002: Password must be at most 64 characters long',
  })
  @Matches(
    /^(?=(?:.*[0-9]){2})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]\x60]).*$/,
    {
      message:
        'CeUrdto-PMBCA2N1UL1SC001: Password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
    },
  )
  password!: string;
}

// --- User Update ---

export class UpdateUserDto {
  @IsString({ message: 'UeUrdto-DNMBAS001: Display Name must be a string' })
  @IsOptional()
  @MaxLength(64, {
    message:
      'UeUrdto-DNMBALTC001: Display Name must be at most 64 characters long',
  })
  displayName?: string;

  @IsEmail({}, { message: 'UeUrdto-EMBAVE001: Email must be a valid email' })
  @IsOptional()
  @MaxLength(255, {
    message: 'UeUrdto-EMBALTC001: Email must be at most 255 characters long',
  })
  @Matches(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, {
    message: 'UeUrdto-EMBMLAV001: Email must be lowercase and valid',
  })
  email?: string;

  @IsString({ message: 'UeUrdto-CPMBAS001: Current password must be a string' })
  @IsOptional()
  currentPassword?: string;

  @IsString({ message: 'UeUrdto-NPMBAS001: New password must be a string' })
  @IsOptional()
  @MinLength(16, {
    message:
      'UeUrdto-NPMBALTC001: New password must be at least 16 characters long',
  })
  @MaxLength(64, {
    message:
      'UeUrdto-NPMBALTC002: New password must be at most 64 characters long',
  })
  @Matches(
    /^(?=(?:.*[0-9]){2})(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]\x60]).*$/,
    {
      message:
        'UeUrdto-NPMBCA2N1UL1SC001: New password must contain at least 2 numbers, 1 uppercase letter, and 1 special character',
    },
  )
  newPassword?: string;

  @IsString({ message: 'UeUrdto-AUMBAS001: Avatar url must be a string' })
  @IsOptional()
  avatarUrl?: string;

  @IsString({ message: 'UeUrdto-BUMBAS001: Banner url must be a string' })
  @IsOptional()
  bannerUrl?: string;

  @IsString({
    message:
      'UeUrdto-SCBUMBAS001: Sidebar card background url must be a string',
  })
  @IsOptional()
  sidebarCardBackgroundUrl?: string;
}

// --- Privacy Settings ---

export class PrivacySettingsDto {
  @IsBoolean({ message: 'PySgDto-PMBAB001: Profile must be a boolean' })
  @IsOptional()
  profile?: boolean;

  @IsBoolean({ message: 'PySgDto-ALMBAB001: Anime list must be a boolean' })
  @IsOptional()
  animeList?: boolean;

  @IsBoolean({ message: 'PySgDto-MLMBAB001: Manga list must be a boolean' })
  @IsOptional()
  mangaList?: boolean;

  @IsBoolean({ message: 'PySgDto-TLMBAB001: TV list must be a boolean' })
  @IsOptional()
  tvList?: boolean;

  @IsBoolean({ message: 'PySgDto-MLMBAB002: Movie list must be a boolean' })
  @IsOptional()
  movieList?: boolean;

  @IsBoolean({ message: 'PySgDto-CMBAB001: Connections must be a boolean' })
  @IsOptional()
  connections?: boolean;
}

// --- Profile Settings ---

export class UpdateSettingsDto {
  @IsObject({ message: 'UeSgDto-PMBAO001: Profile settings must be an object' })
  @IsNotEmpty({
    message: 'UeSgDto-PMNBE001: Profile settings must not be empty',
  })
  profileSettings!: Record<string, string | number | boolean | null>;
}

// --- MFA: TOTP ---

export class EnableTotpDto {
  @IsString({ message: 'EeTpdto-CMBAS001: Code must be a string' })
  @IsNotEmpty({ message: 'EeTpdto-CMNBE001: Code must not be empty' })
  code!: string;
}

// --- MFA: Email ---

export class EnableEmailMfaDto {
  @IsString({ message: 'EeEMdto-CMBAS001: Code must be a string' })
  @IsNotEmpty({ message: 'EeEMdto-CMNBE001: Code must not be empty' })
  code!: string;
}

// --- MFA: Passkey ---

export class VerifyPasskeyDto {
  @IsObject({ message: 'VyPkDto-RMBAO001: Response must be an object' })
  @IsNotEmpty({ message: 'VyPkDto-RMNBE001: Response must not be empty' })
  response!: Record<string, any>;

  @IsString({ message: 'VyPkDto-NMBAS001: Name must be a string' })
  @IsOptional()
  name?: string;
}

// --- Device Registration ---

export class RegisterDeviceDto {
  @IsString({ message: 'RrDvdto-DNMBAS001: Device name must be a string' })
  @IsNotEmpty({ message: 'RrDvdto-DNMNBE001: Device name must not be empty' })
  deviceName!: string;

  @IsString({ message: 'RrDvdto-UAMBAS001: User agent must be a string' })
  @IsOptional()
  userAgent?: string;

  @IsString({ message: 'RrDvdto-IKMBAS001: Identity key must be a string' })
  @IsNotEmpty({ message: 'RrDvdto-IKMNBE001: Identity key must not be empty' })
  identityKey!: string;

  @IsString({ message: 'RrDvdto-SPKMBAS001: Signed pre key must be a string' })
  @IsNotEmpty({
    message: 'RrDvdto-SPKMNBE001: Signed pre key must not be empty',
  })
  signedPreKey!: string;

  @IsArray({ message: 'RrDvdto-PMBAA001: Pre keys must be an array' })
  @IsString({
    each: true,
    message: 'RrDvdto-PKMBAS001: Pre key must be a string',
  })
  @IsOptional()
  preKeys?: string[];
}

// --- Param DTOs ---

export class IdParamDto {
  @IsString({ message: 'IdPmdto-IMBAS001: Id must be a string' })
  @IsNotEmpty({ message: 'IdPmdto-IMNBE001: Id must not be empty' })
  id!: string;
}

export class EmailParamDto {
  @IsEmail({}, { message: 'ElPmdto-EMBAVE001: Email must be a valid email' })
  @IsNotEmpty({ message: 'ElPmdto-EMNBE001: Email must not be empty' })
  email!: string;
}

export class UsernameParamDto {
  @IsString({ message: 'UePmdto-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'UePmdto-UMNBE001: Username must not be empty' })
  username!: string;
}

// --- API Key ---

export class CreateApiKeyDto {
  @IsString({ message: 'CeAKdto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'CeAKdto-NMNBE001: Name must not be empty' })
  @MaxLength(64, {
    message: 'CeAKdto-NMBALTC001: Name must be at most 64 characters long',
  })
  name!: string;

  @IsInt({
    message: 'CeAKdto-EIDBAI001: Expiration in days must be an integer',
  })
  @Min(1, {
    message: 'CeAKdto-EIDBM001: Expiration in days must be at least 1',
  })
  @IsOptional()
  expiresInDays?: number | null;

  @IsString({ message: 'CeAKdto-ABAS001: App must be a string' })
  @IsOptional()
  app?: string;
}

export class RegenerateApiKeyDto {
  @IsUUID(undefined, { message: 'ReAKdto-IMBAU001: Id must be a UUID' })
  @IsNotEmpty({ message: 'ReAKdto-IMNBE001: Id must not be empty' })
  id!: string;
}
