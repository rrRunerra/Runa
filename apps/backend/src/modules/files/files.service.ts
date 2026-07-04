import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as path from 'path';

import {
  rrNotFoundException,
  rrForbiddenException,
  rrInternalServerErrorException,
} from 'src/providers/error';

import { FilesRepository } from './files.repository';
import type {
  UploadPublicEntity,
  UploadLaceraEntity,
  LaceraVisibilityEntity,
} from './files.entity';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly moduleCode = 'FsSve-';

  private readonly s3: S3Client;
  private readonly publicBucket: string;
  private readonly lacertaBucket: string;
  private readonly cdnUrl: string;

  constructor(private readonly filesRepository: FilesRepository) {
    this.s3 = new S3Client({
      endpoint: process.env.RUSTFS_ENDPOINT,
      region: process.env.RUSTFS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.RUSTFS_ACCESS_KEY ?? '',
        secretAccessKey: process.env.RUSTFS_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });

    this.publicBucket = process.env.RUSTFS_PUBLIC_BUCKET ?? 'runa-public';
    this.lacertaBucket = process.env.RUSTFS_LACERTA_BUCKET ?? 'runa-lacerta';
    this.cdnUrl = (process.env.FILES_CDN_URL ?? '').replace(/\/$/, '');
  }

  // ---------------------------------------------------------------------------
  // Public uploads
  // ---------------------------------------------------------------------------

  async uploadPublicFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadPublicEntity> {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const key = `${userId}/${crypto.randomUUID()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.publicBucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
        }),
      );
    } catch (err: unknown) {
      this.logger.error('Failed to upload public file', err);
      throw new rrInternalServerErrorException(`${this.moduleCode}FTUPF001`, {
        message: 'Failed to upload file',
      });
    }

    return { url: `${this.cdnUrl}/${this.publicBucket}/${key}` };
  }

  // ---------------------------------------------------------------------------
  // Lacerta uploads
  // ---------------------------------------------------------------------------

  async uploadLaceraFile(
    file: Express.Multer.File,
    userId: string,
    wrappedKey: string,
  ): Promise<UploadLaceraEntity> {
    const key = `${userId}/${crypto.randomUUID()}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.lacertaBucket,
          Key: key,
          Body: file.buffer,
          ContentType: 'application/octet-stream',
          ContentLength: file.size,
        }),
      );
    } catch (err: unknown) {
      this.logger.error('Failed to upload lacerta file', err);
      throw new rrInternalServerErrorException(`${this.moduleCode}FTULF001`, {
        message: 'Failed to upload file',
      });
    }

    await this.filesRepository.createLaceraFile({ key, userId, wrappedKey });

    return { key };
  }

  // ---------------------------------------------------------------------------
  // Public file retrieval
  // ---------------------------------------------------------------------------

  async getPublicFile(filename: string): Promise<Readable> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.publicBucket,
          Key: filename,
        }),
      );
      return response.Body as Readable;
    } catch {
      throw new rrNotFoundException(`${this.moduleCode}PNF001`, {
        message: 'File not found',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Lacerta file retrieval
  // ---------------------------------------------------------------------------

  async getLaceraFile(
    key: string,
    requestingUserId?: string,
  ): Promise<Readable> {
    const record = await this.filesRepository.findLaceraFileByKey(key);

    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF001`, {
        message: 'File not found',
      });
    }

    if (!record.isPublic && record.userId !== requestingUserId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA001`, {
        message: 'You do not have access to this file',
      });
    }

    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.lacertaBucket,
          Key: key,
        }),
      );
      return response.Body as Readable;
    } catch {
      throw new rrNotFoundException(`${this.moduleCode}LNF002`, {
        message: 'File not found',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Lacerta visibility toggle
  // ---------------------------------------------------------------------------

  async toggleLaceraVisibility(
    key: string,
    userId: string,
  ): Promise<LaceraVisibilityEntity> {
    const record = await this.filesRepository.findLaceraFileByKey(key);

    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF003`, {
        message: 'File not found',
      });
    }

    if (record.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNHTMF001`, {
        message: 'You do not have permission to modify this file',
      });
    }

    const updated = await this.filesRepository.updateLaceraVisibility(
      key,
      !record.isPublic,
    );

    return { key: updated.key, isPublic: updated.isPublic };
  }

  // ---------------------------------------------------------------------------
  // Delete by URL (used by UserService on avatar/banner update)
  // ---------------------------------------------------------------------------

  deleteFileByUrl(url: string | null | undefined): void {
    if (!url) return;

    // Extract the S3 key from the CDN URL: <cdnUrl>/<bucket>/<key>
    const prefix = `${this.cdnUrl}/${this.publicBucket}/`;
    if (!url.startsWith(prefix)) return;
    const key = url.slice(prefix.length);

    this.s3
      .send(new DeleteObjectCommand({ Bucket: this.publicBucket, Key: key }))
      .catch((err: unknown) => {
        this.logger.warn(`Failed to delete file ${key}:`, err);
      });
  }
}
