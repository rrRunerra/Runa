import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import type { User } from '@runa/database';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivacySettingsDto } from './dto/privacy-settings.dto';
import { MediaService } from '../media/media.service';
import { BitField, DEFAULT_PERMISSIONS } from '@runa/permissions';
import bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import { encrypt, decrypt } from '../../common/utils/crypto';
import * as crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

const RESERVED_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "null", "return", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "package", "private", "protected", "public", "static",
  "any", "boolean", "constructor", "declare", "get", "module",
  "require", "number", "set", "string", "symbol", "type", "undefined",
  "unknown", "never", "readonly", "keyof", "infer", "as", "from",
  "of", "namespace", "interface", "implements", "enum", "await",
  "select", "insert", "update", "drop", "truncate", "alter",
  "create", "table", "database", "index", "use", "where", "join",
  "left", "right", "inner", "outer", "on", "and", "or", "not",
  "union", "values", "into", "order", "by", "group", "having",
  "limit", "offset", "distinct", "all", "exists", "like", "between", "is"
]);

export interface PrivacySettings {
  [key: string]: boolean;
  profile: boolean;
  animeList: boolean;
  mangaList: boolean;
  tvList: boolean;
  movieList: boolean;
  connections: boolean;
}

export function parsePrivacy(privacy: unknown): PrivacySettings {
  if (privacy && typeof privacy === 'object') {
    const p = privacy as Record<string, unknown>;
    return {
      profile: p.profile === true,
      animeList: p.animeList === true,
      mangaList: p.mangaList === true,
      tvList: p.tvList === true,
      movieList: p.movieList === true,
      connections: p.connections === true,
    };
  }
  return {
    profile: false,
    animeList: false,
    mangaList: false,
    tvList: false,
    movieList: false,
    connections: false,
  };
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {
    this.checkHasAdmin();
  }

  private readonly logger = new Logger(UserService.name);

  private hasAdmin = false;

  private async checkHasAdmin() {
    this.hasAdmin = (await this.prisma.client.user.count()) > 0;
  }

  async create(data: CreateUserDto): Promise<User> {
    const errors: string[] = [];
    const sanitizedUsername = data.username.replace(/[^a-zA-Z0-9_]/g, "");
    const lowerUsername = sanitizedUsername.toLowerCase();

    if (RESERVED_KEYWORDS.has(lowerUsername)) {
      errors.push('Username cannot be a reserved keyword.');
    }

    const existing = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: lowerUsername }],
      },
    });

    if (existing?.email.toLowerCase() === data.email.toLowerCase()) {
      errors.push('Email is already taken.');
    }

    if (existing?.username.toLowerCase() === lowerUsername) {
      errors.push('Username is already taken.');
    }

    if (errors.length > 0) {
      throw new ConflictException(errors);
    }

    const passHash = await bcrypt.hash(data.password, 10);

    const permissions = new BitField([...DEFAULT_PERMISSIONS]);

    if (!this.hasAdmin) {
      permissions.add(BitField.Flags.ADMINISTRATOR);
    }

    const initialPermissions = permissions.serialize();

    return await this.prisma.client.user
      .create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username.toLowerCase(),
          passwordHash: passHash,
          permissions: initialPermissions,
        },
      })
      .catch((err) => {
        this.logger.error(err);
        throw new BadRequestException('Failed to create user');
      });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        connections: true,
      },
    });
  }

  async update(userId: string, data: UpdateUserDto): Promise<User> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updateData: any = {};
    let passwordOrEmailChanged = false;

    // Email change check
    if (data.email !== undefined && data.email.toLowerCase() !== user.email) {
      passwordOrEmailChanged = true;

      // Ensure the email is not already taken
      const existingEmail = await this.prisma.client.user.findFirst({
        where: { email: data.email.toLowerCase() },
      });
      if (existingEmail && existingEmail.id !== userId) {
        throw new ConflictException('Email is already taken.');
      }
      updateData.email = data.email.toLowerCase();
    }

    // Password change check
    if (data.newPassword !== undefined) {
      passwordOrEmailChanged = true;
    }

    // Enforce password confirmation for password or email changes
    if (passwordOrEmailChanged) {
      if (!data.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change email or password.',
        );
      }
      const isCurrentPasswordValid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Invalid current password.');
      }

      if (data.newPassword !== undefined) {
        updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
        updateData.passwordChangedAt = new Date();
      }
    }

    const oldAvatarUrl = user.avatarUrl;
    const oldBannerUrl = user.bannerUrl;
    const oldSidebarCardBackgroundUrl = user.sidebarCardBackgroundUrl;

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl;
    }

    if (data.bannerUrl !== undefined) {
      updateData.bannerUrl = data.bannerUrl;
    }

    if (data.sidebarCardBackgroundUrl !== undefined) {
      updateData.sidebarCardBackgroundUrl = data.sidebarCardBackgroundUrl;
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.cacheService.del(`user:permissions:${userId}`);

    if (data.avatarUrl !== undefined && data.avatarUrl !== oldAvatarUrl) {
      this.mediaService.deleteFileByUrl(oldAvatarUrl);
    }

    if (data.bannerUrl !== undefined && data.bannerUrl !== oldBannerUrl) {
      this.mediaService.deleteFileByUrl(oldBannerUrl);
    }

    if (data.sidebarCardBackgroundUrl !== undefined && data.sidebarCardBackgroundUrl !== oldSidebarCardBackgroundUrl) {
      this.mediaService.deleteFileByUrl(oldSidebarCardBackgroundUrl);
    }

    return updatedUser;
  }

  async getPrivacySettings(username: string): Promise<PrivacySettings> {
    const user = await this.prisma.client.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        privacy: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${username} not found`);
    }

    return parsePrivacy(user.privacy);
  }

  async updatePrivacySettings(userId: string, dto: PrivacySettingsDto): Promise<{ success: boolean }> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        privacy: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const currentPrivacy = parsePrivacy(user.privacy);
    const updatedPrivacy: PrivacySettings = {
      profile: dto.profile !== undefined ? dto.profile : currentPrivacy.profile,
      animeList: dto.animeList !== undefined ? dto.animeList : currentPrivacy.animeList,
      mangaList: dto.mangaList !== undefined ? dto.mangaList : currentPrivacy.mangaList,
      tvList: dto.tvList !== undefined ? dto.tvList : currentPrivacy.tvList,
      movieList: dto.movieList !== undefined ? dto.movieList : currentPrivacy.movieList,
      connections: dto.connections !== undefined ? dto.connections : currentPrivacy.connections,
    };

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: userId },
        data: { privacy: updatedPrivacy },
      }),
      ...(dto.animeList !== undefined
        ? [
            this.prisma.client.aquilaAnimeUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.animeList },
            }),
          ]
        : []),
      ...(dto.mangaList !== undefined
        ? [
            this.prisma.client.aquilaMangaUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.mangaList },
            }),
          ]
        : []),
      ...(dto.tvList !== undefined
        ? [
            this.prisma.client.aquilaTvUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.tvList },
            }),
          ]
        : []),
      ...(dto.movieList !== undefined
        ? [
            this.prisma.client.aquilaMovieUserList.updateMany({
              where: { username: user.username },
              data: { private: dto.movieList },
            }),
          ]
        : []),
      ...(dto.connections !== undefined
        ? [
            this.prisma.client.connections.updateMany({
              where: { username: user.username },
              data: { private: dto.connections },
            }),
          ]
        : []),
    ]);

    return { success: true };
  }


  async updateSettings(userId: string, settings: any) {
    return await this.prisma.client.user.update({
      where: { id: userId },
      data: { profileSettings: settings },
    });
  }

  // --- MFA Configuration & Setup Methods ---

  async generateTotpSetup(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Runa',
      label: user.username,
      secret,
    });

    // Save pending secret to cache for 10 minutes
    await this.cacheService.set(`pending-totp:${userId}`, secret, 600);

    return { secret, otpauthUrl };
  }

  async enableTotp(userId: string, code: string): Promise<string[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const pendingSecret = await this.cacheService.get<string>(`pending-totp:${userId}`);
    if (!pendingSecret) {
      throw new BadRequestException('TOTP setup has expired or was not initiated');
    }

    const verifyResult = await verify({ token: code, secret: pendingSecret });
    if (!verifyResult.valid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Encrypt the TOTP secret
    const encryptedSecret = encrypt(pendingSecret);

    // Check if we need to generate backup codes (only if no other MFA was active)
    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;
    let backupCodes: string[] = [];
    let hashedBackupCodes: string[] = [];

    if (!isMfaActive) {
      const generated = await this.generateBackupCodesRaw();
      backupCodes = generated.plain;
      hashedBackupCodes = generated.hashed;
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: true,
        ...(hashedBackupCodes.length > 0 ? { backupCodes: hashedBackupCodes } : {}),
      },
    });

    await this.cacheService.del(`pending-totp:${userId}`);

    return backupCodes;
  }

  async disableTotp(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const remainingMfa = user.emailMfaEnabled || user.passkeys.length > 0;

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        totpEnabled: false,
        totpSecret: null,
        ...(!remainingMfa ? { backupCodes: [] } : {}),
      },
    });

    return { success: true };
  }

  async sendEmailMfaSetupCode(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`pending-email-mfa:${userId}`, code, 300); // 5 min expiry

    await this.mailService.sendMail(
      user.email,
      'Runa - Enable Email Multi-Factor Authentication',
      `Your verification code is: ${code}. This code is valid for 5 minutes.`,
    );

    return { success: true };
  }

  async enableEmailMfa(userId: string, code: string): Promise<string[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const cachedCode = await this.cacheService.get<string>(`pending-email-mfa:${userId}`);
    if (!cachedCode || cachedCode !== code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;
    let backupCodes: string[] = [];
    let hashedBackupCodes: string[] = [];

    if (!isMfaActive) {
      const generated = await this.generateBackupCodesRaw();
      backupCodes = generated.plain;
      hashedBackupCodes = generated.hashed;
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        emailMfaEnabled: true,
        ...(hashedBackupCodes.length > 0 ? { backupCodes: hashedBackupCodes } : {}),
      },
    });

    await this.cacheService.del(`pending-email-mfa:${userId}`);

    return backupCodes;
  }

  async disableEmailMfa(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const remainingMfa = user.totpEnabled || user.passkeys.length > 0;

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        emailMfaEnabled: false,
        ...(!remainingMfa ? { backupCodes: [] } : {}),
      },
    });

    return { success: true };
  }

  private async generateBackupCodesRaw(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(5).toString('hex');
      plain.push(code);
      hashed.push(await bcrypt.hash(code, 10));
    }

    return { plain, hashed };
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;
    if (!isMfaActive) {
      throw new BadRequestException('MFA must be active to generate backup codes');
    }

    const { plain, hashed } = await this.generateBackupCodesRaw();

    await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        backupCodes: hashed,
      },
    });

    return plain;
  }

  // --- WebAuthn / Passkey Registration Methods ---

  async generatePasskeyRegisterOptions(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;

    const options = await generateRegistrationOptions({
      rpName: 'Runa',
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.username,
      userDisplayName: user.displayName || user.username,
      excludeCredentials: user.passkeys.map((pk) => ({
        id: pk.id,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await this.cacheService.set(`passkey-reg-challenge:${userId}`, options.challenge, 300);

    return options;
  }

  async verifyPasskeyRegister(userId: string, body: any, name?: string): Promise<string[]> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const expectedChallenge = await this.cacheService.get<string>(`passkey-reg-challenge:${userId}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Passkey registration challenge expired');
    }

    const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;
    const expectedOrigin = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
      });
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Passkey verification failed');
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey verification failed');
    }

    const { id: credentialID, publicKey: credentialPublicKey, counter, transports } = verification.registrationInfo.credential;

    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || user.passkeys.length > 0;
    let backupCodes: string[] = [];
    let hashedBackupCodes: string[] = [];

    if (!isMfaActive) {
      const generated = await this.generateBackupCodesRaw();
      backupCodes = generated.plain;
      hashedBackupCodes = generated.hashed;
    }

    await this.prisma.client.$transaction([
      this.prisma.client.passkey.create({
        data: {
          id: credentialID,
          publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter: counter,
          transports: (transports as string[]) || body.response.transports || [],
          name: name || 'Passkey',
          userId: user.id,
        },
      }),
      this.prisma.client.user.update({
        where: { id: userId },
        data: {
          ...(hashedBackupCodes.length > 0 ? { backupCodes: hashedBackupCodes } : {}),
        },
      }),
    ]);

    await this.cacheService.del(`passkey-reg-challenge:${userId}`);

    return backupCodes;
  }

  async deletePasskey(userId: string, passkeyId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const passkey = user.passkeys.find((pk) => pk.id === passkeyId);
    if (!passkey) throw new NotFoundException('Passkey not found');

    await this.prisma.client.passkey.delete({
      where: { id: passkeyId },
    });

    const remainingPasskeys = user.passkeys.filter((pk) => pk.id !== passkeyId).length;
    const remainingMfa = user.totpEnabled || user.emailMfaEnabled || remainingPasskeys > 0;

    if (!remainingMfa) {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          backupCodes: [],
        },
      });
    }

    return { success: true };
  }

  async getPasskeys(userId: string) {
    return await this.prisma.client.passkey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async getMfaStatus(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      totpEnabled: user.totpEnabled,
      emailMfaEnabled: user.emailMfaEnabled,
      hasBackupCodes: user.backupCodes.length > 0,
      passkeysCount: user.passkeys.length,
    };
  }

  // --- Device Management Methods ---

  async getDevices(userId: string) {
    return await this.prisma.client.device.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        lastActiveAt: true,
        identityKey: true,
        signedPreKey: true,
        encryptedMasterKey: true,
      },
    });
  }

  async deleteDevice(userId: string, deviceId: string) {
    const device = await this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
    });
    if (!device) throw new NotFoundException('Device not found');

    await this.prisma.client.device.delete({
      where: { id: deviceId },
    });

    return { success: true };
  }

  async registerDevice(userId: string, data: { deviceName: string; userAgent?: string; identityKey: string; signedPreKey: string; preKeys?: string[] }) {
    const existing = await this.prisma.client.device.findFirst({
      where: { identityKey: data.identityKey, userId },
    });

    if (existing) {
      const updated = await this.prisma.client.device.update({
        where: { id: existing.id },
        data: {
          deviceName: data.deviceName,
          userAgent: data.userAgent || null,
          lastActiveAt: new Date(),
          signedPreKey: data.signedPreKey,
        },
      });
      return updated;
    }

    const device = await this.prisma.client.device.create({
      data: {
        userId,
        deviceName: data.deviceName,
        userAgent: data.userAgent || null,
        identityKey: data.identityKey,
        signedPreKey: data.signedPreKey,
      },
    });

    if (data.preKeys && data.preKeys.length > 0) {
      await this.prisma.client.preKey.createMany({
        data: data.preKeys.map(key => ({
          deviceId: device.id,
          key,
        })),
      });
    }

    const otherDevices = await this.prisma.client.device.findMany({
      where: { userId, id: { not: device.id } },
    });

    if (otherDevices.length > 0) {
      await this.prisma.client.notification.create({
        data: {
          userId,
          title: 'New Device Link Request',
          message: `A new device "${data.deviceName}" wants to link to your account.`,
          type: 'INTERACTIVE',
          status: 'PENDING',
          metadata: {
            deviceId: device.id,
            deviceName: data.deviceName,
            publicKey: data.identityKey,
          } as any,
        },
      });
    }

    return device;
  }

  async getDeviceStatus(userId: string, deviceId: string) {
    const device = await this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
      select: {
        id: true,
        encryptedMasterKey: true,
      },
    });
    if (!device) throw new NotFoundException('Device not found');
    return {
      id: device.id,
      approved: device.encryptedMasterKey !== null,
      encryptedMasterKey: device.encryptedMasterKey,
    };
  }

  async updateE2eeKeys(userId: string, userPublicKey: string, encryptedUserPrivateKey: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    return await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        userPublicKey,
        encryptedUserPrivateKey,
      },
    });
  }

  async getE2eeKeys(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        userPublicKey: true,
        encryptedUserPrivateKey: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
