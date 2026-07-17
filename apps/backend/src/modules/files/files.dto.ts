import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// POST /files/lacerta/upload/init
// ---------------------------------------------------------------------------

export class InitLaceraUploadDto {
  /** AES-GCM encrypted file name (hex:hex:hex format) */
  @IsString()
  @IsNotEmpty()
  encName: string;

  /** AES-GCM encrypted MIME type */
  @IsString()
  @IsNotEmpty()
  encType: string;

  /** ECDH-wrapped symmetric file key (JSON serialised EncryptedKeyPayload) */
  @IsString()
  @IsNotEmpty()
  wrappedKey: string;

  /** Original unencrypted file size in bytes (used for metadata + AAD) */
  @IsInt()
  @Min(0)
  totalSize: number;

  /** Number of 32 MiB ciphertext chunks the client will upload */
  @IsInt()
  @Min(1)
  chunkCount: number;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isVault?: boolean;
}

// ---------------------------------------------------------------------------
// POST /files/lacerta/upload/part  (query params)
// ---------------------------------------------------------------------------

export class UploadPartQueryDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsInt()
  @Min(1)
  @Max(10_000)
  @Type(() => Number)
  partNumber: number;
}

// ---------------------------------------------------------------------------
// POST /files/lacerta/upload/complete
// ---------------------------------------------------------------------------

export class CompletedPartDto {
  @IsInt()
  @Min(1)
  @Max(10_000)
  partNumber: number;

  @IsString()
  @IsNotEmpty()
  etag: string;
}

export class CompleteLaceraUploadDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts: CompletedPartDto[];
}
