import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import * as crypto from 'crypto';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

import {
  rrNotFoundException,
  rrForbiddenException,
  rrBadRequestException,
  rrInternalServerErrorException,
} from 'src/providers/error';

import { hasPermission, LacertaFlags } from '@runa/permissions';
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
  // ---------------------------------------------------------------------------
  // Lacerta listings
  // ---------------------------------------------------------------------------

  async listLaceraFiles(userId: string) {
    return this.filesRepository.listLaceraFiles(userId);
  }

  // ---------------------------------------------------------------------------
  // Lacerta folder creation
  // ---------------------------------------------------------------------------

  async createLaceraFolder(
    userId: string,
    name: string,
    wrappedKey: string,
    parentId?: string,
    isVault?: boolean,
  ) {
    const key = `folder-${userId}/${crypto.randomUUID()}`;
    return this.filesRepository.createLaceraFile({
      key,
      userId,
      wrappedKey,
      name,
      parentId: parentId || undefined,
      isFolder: true,
      isVault: isVault ?? false,
    });
  }

  // ---------------------------------------------------------------------------
  // Lacerta uploads
  // ---------------------------------------------------------------------------

  async uploadLaceraFile(
    file: Express.Multer.File,
    userId: string,
    wrappedKey: string,
    name: string,
    size: number,
    type: string,
    parentId?: string,
    isVault?: boolean,
  ): Promise<UploadLaceraEntity> {
    await this.checkUploadPermissionsAndLimit(userId, size);
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

    await this.filesRepository.createLaceraFile({
      key,
      userId,
      wrappedKey,
      name,
      size,
      type,
      parentId: parentId || undefined,
      isFolder: false,
      isVault: isVault ?? false,
    });

    return { key };
  }

  // ---------------------------------------------------------------------------
  // Lacerta multipart (chunked) upload — init / part / complete / abort
  // ---------------------------------------------------------------------------

  /**
   * Initialises a multipart upload on S3 and creates a pending LaceraFile stub.
   * Returns the fileId (for the stub row) and the S3 uploadId so the client can
   * reference them when uploading individual parts.
   */
  async initLaceraMultipartUpload(
    userId: string,
    encName: string,
    encType: string,
    wrappedKey: string,
    totalSize: number,
    chunkCount: number,
    parentId?: string,
    isVault?: boolean,
  ): Promise<{ fileId: string; uploadId: string }> {
    await this.checkUploadPermissionsAndLimit(userId, totalSize);
    const key = `${userId}/${crypto.randomUUID()}`;

    // 1. Start the S3 multipart upload session
    let uploadId: string;
    try {
      const result = await this.s3.send(
        new CreateMultipartUploadCommand({
          Bucket: this.lacertaBucket,
          Key: key,
          ContentType: 'application/octet-stream',
        }),
      );
      if (!result.UploadId) {
        throw new Error('S3 did not return an UploadId');
      }
      uploadId = result.UploadId;
    } catch (err: unknown) {
      this.logger.error('Failed to create multipart upload', err);
      throw new rrInternalServerErrorException(`${this.moduleCode}FCMU001`, {
        message: 'Failed to initialise file upload',
      });
    }

    // 2. Create a pending file stub in the database
    const fileStub = await this.filesRepository.createLaceraFile({
      key,
      userId,
      wrappedKey,
      name: encName,
      size: totalSize,
      type: encType,
      parentId: parentId ?? undefined,
      isFolder: false,
      isVault: isVault ?? false,
      isUploadPending: true,
      chunkCount,
    });

    // 3. Persist the upload manifest for tracking and resumability
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 h
    await this.filesRepository.createLaceraUpload({
      fileId: fileStub.id,
      uploadId,
      key,
      bucket: this.lacertaBucket,
      chunkCount,
      expiresAt,
    });

    this.logger.log(
      `[Multipart] Init fileId="${fileStub.id}" uploadId="${uploadId}" chunks=${chunkCount}`,
    );

    return { fileId: fileStub.id, uploadId };
  }

  /**
   * Receives a raw ciphertext chunk stream from the client and forwards it
   * directly to S3 as a multipart part. Never buffers the full file.
   *
   * @param fileId   - LaceraFile stub ID
   * @param partNumber - 1-based part index
   * @param userId   - Requesting user (ownership check)
   * @param bodyStream - Raw HTTP request body (piped straight to S3)
   * @param contentLength - Byte length of the chunk (required by S3)
   */
  async uploadLaceraChunk(
    fileId: string,
    partNumber: number,
    userId: string,
    bodyStream: Readable,
    contentLength: number,
  ): Promise<{ etag: string; partNumber: number }> {
    // Verify ownership via the upload manifest
    const manifest = await this.filesRepository.findLaceraUploadByFileId(fileId);
    if (!manifest) {
      throw new rrNotFoundException(`${this.moduleCode}MNF001`, {
        message: 'Upload session not found',
      });
    }

    const fileStub = await this.filesRepository.findLaceraFileById(fileId);
    if (!fileStub || fileStub.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA008`, {
        message: 'You do not have permission to upload to this file',
      });
    }

    // Validate part number range
    if (partNumber < 1 || partNumber > manifest.chunkCount) {
      throw new rrBadRequestException(`${this.moduleCode}IPN001`, {
        message: `Invalid part number ${partNumber} (expected 1–${manifest.chunkCount})`,
      });
    }

    let etag: string;
    try {
      const result = await this.s3.send(
        new UploadPartCommand({
          Bucket: manifest.bucket,
          Key: manifest.key,
          UploadId: manifest.uploadId,
          PartNumber: partNumber,
          Body: bodyStream,
          ContentLength: contentLength,
        }),
      );
      if (!result.ETag) {
        throw new Error('S3 did not return an ETag for the uploaded part');
      }
      etag = result.ETag;
    } catch (err: unknown) {
      this.logger.error(
        `[Multipart] Failed to upload part ${partNumber} for fileId="${fileId}"`,
        err,
      );
      throw new rrInternalServerErrorException(`${this.moduleCode}FUCP001`, {
        message: 'Failed to upload chunk',
      });
    }

    this.logger.log(
      `[Multipart] Part ${partNumber}/${manifest.chunkCount} OK etag=${etag} fileId="${fileId}"`,
    );
    return { etag, partNumber };
  }

  /**
   * Finalises the multipart upload once all parts have been received.
   * Marks the LaceraFile stub as no longer pending.
   */
  async completeLaceraMultipartUpload(
    fileId: string,
    userId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<{ key: string }> {
    const manifest = await this.filesRepository.findLaceraUploadByFileId(fileId);
    if (!manifest) {
      throw new rrNotFoundException(`${this.moduleCode}MNF002`, {
        message: 'Upload session not found',
      });
    }

    const fileStub = await this.filesRepository.findLaceraFileById(fileId);
    if (!fileStub || fileStub.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA009`, {
        message: 'You do not have permission to complete this upload',
      });
    }

    if (parts.length !== manifest.chunkCount) {
      throw new rrBadRequestException(`${this.moduleCode}IPC001`, {
        message: `Expected ${manifest.chunkCount} parts but received ${parts.length}`,
      });
    }

    try {
      await this.s3.send(
        new CompleteMultipartUploadCommand({
          Bucket: manifest.bucket,
          Key: manifest.key,
          UploadId: manifest.uploadId,
          MultipartUpload: {
            Parts: [...parts]
              .sort((a, b) => a.partNumber - b.partNumber)
              .map((p) => ({
                PartNumber: p.partNumber,
                ETag: p.etag,
              })),
          },
        }),
      );
    } catch (err: unknown) {
      this.logger.error(
        `[Multipart] Failed to complete upload for fileId="${fileId}"`,
        err,
      );
      throw new rrInternalServerErrorException(`${this.moduleCode}FCMU002`, {
        message: 'Failed to finalise upload',
      });
    }

    // Mark the upload manifest as complete and make the file visible
    await this.filesRepository.completeLaceraUpload(fileId);
    await this.filesRepository.updateLaceraMetadata(fileId, {
      isUploadPending: false,
    });

    this.logger.log(
      `[Multipart] Completed fileId="${fileId}" key="${manifest.key}"`,
    );
    return { key: manifest.key };
  }

  /**
   * Aborts an in-progress multipart upload and removes the stub file record.
   * Safe to call multiple times — S3 and DB operations are idempotent.
   */
  async abortLaceraMultipartUpload(
    fileId: string,
    userId: string,
  ): Promise<void> {
    const manifest = await this.filesRepository.findLaceraUploadByFileId(fileId);
    if (!manifest) return; // already cleaned up

    const fileStub = await this.filesRepository.findLaceraFileById(fileId);
    if (fileStub && fileStub.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA010`, {
        message: 'You do not have permission to abort this upload',
      });
    }

    // Abort on S3 (best-effort; log but don't throw on S3 failure)
    try {
      await this.s3.send(
        new AbortMultipartUploadCommand({
          Bucket: manifest.bucket,
          Key: manifest.key,
          UploadId: manifest.uploadId,
        }),
      );
    } catch (err: unknown) {
      this.logger.warn(
        `[Multipart] S3 abort failed for fileId="${fileId}" (may already be aborted):`,
        err,
      );
    }

    // Clean up DB records
    await this.filesRepository.deleteLaceraUpload(fileId);
    if (fileStub) {
      await this.filesRepository.deleteLaceraFileById(fileId);
    }

    this.logger.log(`[Multipart] Aborted fileId="${fileId}"`);
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
  // Lacerta file retrieval (routed through server, streams from S3)
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

    const isShared = record.shares.some((s) => s.userId === requestingUserId);

    if (!record.isPublic && record.userId !== requestingUserId && !isShared) {
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

  /**
   * Directly stream a lacerta file from S3 by its storage key.
   * Caller is responsible for access checks — this method ONLY fetches from S3.
   * Returns null if the object does not exist (never throws HttpException).
   */
  async getLaceraFileStreamDirect(key: string): Promise<Readable | null> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.lacertaBucket,
          Key: key,
        }),
      );
      return response.Body as Readable;
    } catch (err: unknown) {
      this.logger.warn(
        `[S3] Object not found for key="${key}": ${String(err)}`,
      );
      return null;
    }
  }

  async getLaceraFileMetadata(id: string) {
    const file = await this.filesRepository.findLaceraFileById(id);

    if (!file) {
      throw new rrNotFoundException(`${this.moduleCode}LNF008`, {
        message: 'File not found',
      });
    }
    if (!file.isPublic) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA006`, {
        message: 'This file is private',
      });
    }
    return {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      key: file.key,
      isPublic: file.isPublic,
      user: file.user,
      chunkCount: file.chunkCount,
    };
  }

  async updateLaceraFileContent(
    id: string,
    userId: string | undefined,
    file: Express.Multer.File,
    size: number,
  ) {
    const record = await this.filesRepository.findLaceraFileById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF009`, {
        message: 'File not found',
      });
    }

    if (userId) {
      // Check if editor is blocked
      const editor = await this.filesRepository.findUserUploadLimits(userId);
      if (editor && !hasPermission(editor.permissions, LacertaFlags.UPLOAD_FILES)) {
        throw new rrForbiddenException(`${this.moduleCode}UB001`, {
          message: 'You do not have permission to upload files (blocked by administrator)',
        });
      }

      // Check if owner's storage limit is exceeded
      const owner = await this.filesRepository.findUserUploadLimits(record.userId);
      if (owner) {
        const currentUsage = await this.filesRepository.getUserStorageUsage(record.userId, id);
        if (currentUsage + size > owner.lacertaMaxStorage) {
          throw new rrForbiddenException(`${this.moduleCode}SLE001`, {
            message: `Owner's storage limit exceeded. Allowed: ${this.formatBytes(
              owner.lacertaMaxStorage,
            )}, trying to upload: ${this.formatBytes(
              size,
            )}, currently using: ${this.formatBytes(currentUsage)}`,
          });
        }
      }
    }

    const isOwner = userId ? record.userId === userId : false;
    const shareRecord = userId
      ? record.shares.find((s) => s.userId === userId)
      : null;

    let hasEditAccess = isOwner || record.isPublic;
    if (shareRecord) {
      hasEditAccess = shareRecord.allowEdit;
    }

    if (!hasEditAccess) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA007`, {
        message: 'You do not have edit access to this file',
      });
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.lacertaBucket,
          Key: record.key,
          Body: file.buffer,
          ContentType: 'application/octet-stream',
          ContentLength: file.size,
        }),
      );
    } catch (err: unknown) {
      this.logger.error('Failed to update S3 object content', err);
      throw new rrInternalServerErrorException(`${this.moduleCode}FTULF002`, {
        message: 'Failed to update file content',
      });
    }

    return this.filesRepository.updateLaceraMetadata(id, { size });
  }

  // ---------------------------------------------------------------------------
  // Lacerta metadata updates & visibility toggle
  // ---------------------------------------------------------------------------

  async updateLaceraMetadata(
    id: string,
    userId: string,
    data: {
      name?: string;
      parentId?: string | null;
      isTrash?: boolean;
      isVault?: boolean;
      isPublic?: boolean;
    },
  ) {
    const record = await this.filesRepository.findLaceraFileById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF004`, {
        message: 'File not found',
      });
    }
    if (record.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA002`, {
        message: 'You do not have permission to modify this file',
      });
    }
    const updated = await this.filesRepository.updateLaceraMetadata(id, data);

    if (data.isTrash !== undefined && record.isFolder) {
      const descendants = await this.filesRepository.findLaceraDescendants(id);
      if (descendants.length > 0) {
        const descendantIds = descendants.map((d) => d.id);
        await this.filesRepository.updateLaceraFilesTrashState(
          descendantIds,
          data.isTrash,
        );
      }
    }

    return updated;
  }

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
  // Lacerta sharing controls
  // ---------------------------------------------------------------------------

  async shareLaceraFile(
    id: string,
    userId: string,
    recipientId: string,
    wrappedKey: string,
    allowEdit?: boolean,
  ) {
    const record = await this.filesRepository.findLaceraFileById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF006`, {
        message: 'File not found',
      });
    }
    if (record.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA004`, {
        message: 'You do not have permission to share this file',
      });
    }

    return this.filesRepository.createLaceraShare({
      fileId: id,
      userId: recipientId,
      wrappedKey,
      allowEdit: allowEdit ?? true,
    });
  }

  async unshareLaceraFile(id: string, userId: string, recipientId: string) {
    const record = await this.filesRepository.findLaceraFileById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF007`, {
        message: 'File not found',
      });
    }
    if (record.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA005`, {
        message: 'You do not have permission to modify shares for this file',
      });
    }

    await this.filesRepository.deleteLaceraShare(id, recipientId);
  }

  // ---------------------------------------------------------------------------
  // Lacerta file deletion
  // ---------------------------------------------------------------------------

  async deleteLaceraFile(id: string, userId: string): Promise<void> {
    const record = await this.filesRepository.findLaceraFileById(id);
    if (!record) {
      throw new rrNotFoundException(`${this.moduleCode}LNF005`, {
        message: 'File not found',
      });
    }
    if (record.userId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YDNAHTA003`, {
        message: 'You do not have permission to delete this file',
      });
    }

    const targetsToDelete: any[] = [record];
    if (record.isFolder) {
      const descendants = await this.filesRepository.findLaceraDescendants(id);
      targetsToDelete.push(...descendants);
    }

    for (const target of targetsToDelete) {
      if (!target.isFolder) {
        try {
          await this.s3.send(
            new DeleteObjectCommand({
              Bucket: this.lacertaBucket,
              Key: target.key,
            }),
          );
        } catch (err: unknown) {
          this.logger.warn(
            `Failed to delete S3 object for key ${target.key}:`,
            err,
          );
        }
      }
    }

    await this.filesRepository.deleteLaceraFileById(id);
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

  async hasVaultPin(userId: string): Promise<boolean> {
    const hash = await this.filesRepository.findUserVaultPinHash(userId);
    return !!hash;
  }

  async setupVaultPin(userId: string, pin: string): Promise<void> {
    const hash = await bcrypt.hash(pin, 10);
    await this.filesRepository.updateUserVaultPinHash(userId, hash);
  }

  async verifyVaultPin(userId: string, pin: string): Promise<boolean> {
    const hash = await this.filesRepository.findUserVaultPinHash(userId);
    if (!hash) return false;
    return bcrypt.compare(pin, hash);
  }

  async resetVault(userId: string): Promise<void> {
    const vaultFiles = await this.filesRepository.findUserVaultFiles(userId);

    for (const file of vaultFiles) {
      if (!file.isFolder) {
        try {
          await this.s3.send(
            new DeleteObjectCommand({
              Bucket: this.lacertaBucket,
              Key: file.key,
            }),
          );
        } catch (err: unknown) {
          this.logger.warn(
            `Failed to delete S3 object for vault key ${file.key}:`,
            err,
          );
        }
      }
    }

    await this.filesRepository.deleteUserVaultFiles(userId);
    await this.filesRepository.updateUserVaultPinHash(userId, null);
  }

  public async getStorageInfo(userId: string) {
    const user = await this.filesRepository.findUserUploadLimits(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
        message: 'User not found',
      });
    }

    const used = await this.filesRepository.getUserStorageUsage(userId);
    return {
      used,
      limit: user.lacertaMaxStorage,
      blocked: !hasPermission(user.permissions, LacertaFlags.UPLOAD_FILES),
    };
  }

  public async getUserStorageUsage(userId: string): Promise<number> {
    return this.filesRepository.getUserStorageUsage(userId);
  }

  private async checkUploadPermissionsAndLimit(
    userId: string,
    additionalSize: number,
    excludeFileId?: string,
  ): Promise<void> {
    const user = await this.filesRepository.findUserUploadLimits(userId);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}UNF002`, {
        message: 'User not found',
      });
    }

    // Check block status via permission flags
    if (!hasPermission(user.permissions, LacertaFlags.UPLOAD_FILES)) {
      throw new rrForbiddenException(`${this.moduleCode}UB001`, {
        message: 'You do not have permission to upload files (blocked by administrator)',
      });
    }

    // Check limit
    const currentUsage = await this.filesRepository.getUserStorageUsage(
      userId,
      excludeFileId,
    );

    if (currentUsage + additionalSize > user.lacertaMaxStorage) {
      throw new rrForbiddenException(`${this.moduleCode}SLE001`, {
        message: `Storage limit exceeded. Allowed: ${this.formatBytes(
          user.lacertaMaxStorage,
        )}, trying to upload: ${this.formatBytes(
          additionalSize,
        )}, currently using: ${this.formatBytes(currentUsage)}`,
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
