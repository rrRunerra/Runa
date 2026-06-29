import { UnauthorizedException, BadRequestException, NotFoundException, Injectable, Logger } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import { encrypt, decrypt } from '@runa/crypto/server';
import { generateDataKey, encryptWithDataKey, encryptDataKeyForUser } from '@runa/crypto/node';
import { verify } from 'otplib';
import bcrypt from 'bcrypt';
import type { User, Passkey } from '@runa/database';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  public async login(data: LoginAuthDto) {
    this.logger.log(`[Login Step 1/5] Initiating login flow. Identifier: ${data.identifier || 'none'}, hasMfaSuccessToken: ${!!data.mfaSuccessToken}, isPasskeyOnly: ${data.isPasskeyOnly}`);

    // 1. Check if MFA Success Token is provided (from client after MFA verify succeeded)
    if (data.mfaSuccessToken) {
      this.logger.log(`[Login Step 1/5] MFA Success Token found. Verifying JWT signature...`);
      try {
        const { payload } = await jwtVerify(data.mfaSuccessToken, this.secret, {
          algorithms: ['HS256'],
        });
        if (payload.type !== 'mfa_success' || !payload.sub) {
          this.logger.warn(`[Login Step 1/5] MFA Success Token validation failed: Type mismatch or sub missing.`);
          throw new UnauthorizedException('Invalid MFA success token');
        }

        const user = await this.prisma.client.user.findUnique({
          where: { id: payload.sub as string },
        });

        if (!user) {
          this.logger.warn(`[Login Step 1/5] User not found for ID: ${payload.sub}`);
          throw new UnauthorizedException('User not found');
        }

        this.logger.log(`[Login Step 1/5] MFA Success Token successfully verified for user: ${user.username} (${user.id}). Signing login session token...`);
        const token = await this.signToken(user);
        this.logger.log(`[Login Step 1/5] Login session token signed successfully. Returning session for user: ${user.username}`);

        return {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            permissions: user.permissions,
            avatarUrl: user.avatarUrl,
            displayName: user.displayName,
            passwordChangedAt: user.passwordChangedAt,
          },
          token,
        };
      } catch (err: any) {
        this.logger.error(`[Login Step 1/5] MFA success token verification failed: ${err.message}`, err.stack);
        throw new UnauthorizedException(err.message || 'MFA verification expired or invalid');
      }
    }

    // 2. Check if this is a Passwordless Passkey direct login
    if (data.isPasskeyOnly === 'true' && data.passkeyResponse) {
      this.logger.log(`[Login Step 2/5] Passkey direct login requested. Routing to verifyPasskeyLogin...`);
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(data.passkeyResponse);
      } catch {
        this.logger.error(`[Login Step 2/5] Failed to parse passkeyResponse JSON`);
        throw new BadRequestException('Invalid passkey assertion response format');
      }
      return this.verifyPasskeyLogin(data.identifier, parsedResponse);
    }

    // 3. Locate User by Username or Email
    if (!data.identifier) {
      this.logger.warn(`[Login Step 3/5] Login failed: Missing identifier (email or username)`);
      throw new BadRequestException('Identifier is required');
    }

    this.logger.log(`[Login Step 3/5] Locating user with identifier: ${data.identifier}`);
    const user = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.identifier }, { username: data.identifier }],
      },
      include: {
        passkeys: true,
        devices: true,
      },
    });

    if (!user) {
      this.logger.warn(`[Login Step 3/5] User not found for identifier: ${data.identifier}`);
      throw new UnauthorizedException('User not found');
    }
    this.logger.log(`[Login Step 3/5] User found: ${user.username} (${user.id}).`);

    // 4. Verify password
    if (!data.password) {
      this.logger.warn(`[Login Step 4/5] Password not provided for user: ${user.username}`);
      throw new UnauthorizedException('Password is required');
    }

    this.logger.log(`[Login Step 4/5] Comparing password hashes...`);
    const passHash = await bcrypt.compare(data.password, user.passwordHash);

    if (!passHash) {
      this.logger.warn(`[Login Step 4/5] Password comparison failed for user: ${user.username}`);
      throw new UnauthorizedException('Invalid password');
    }
    this.logger.log(`[Login Step 4/5] Password verified successfully for user: ${user.username}`);

    // 5. Check if MFA is active for this user
    const hasPasskeys = user.passkeys.length > 0;
    const hasDevices = user.devices.length > 0;
    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || hasPasskeys || hasDevices;

    if (isMfaActive) {
      this.logger.log(`[Login Step 5/5] MFA is active for ${user.username} (TOTP: ${user.totpEnabled}, Email: ${user.emailMfaEnabled}, Passkeys: ${hasPasskeys}, Devices: ${hasDevices}). Generating mfa_pending tempToken...`);
      // Generate a short-lived JWT pending MFA token (5 minutes)
      const tempToken = await new SignJWT({
        sub: user.id,
        type: 'mfa_pending',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(this.secret);

      const allowedMethods: string[] = [];
      if (user.totpEnabled) allowedMethods.push('totp');
      if (user.emailMfaEnabled) allowedMethods.push('email');
      if (hasPasskeys) allowedMethods.push('passkey');
      if (user.backupCodes.length > 0) allowedMethods.push('backup');
      if (hasDevices) allowedMethods.push('device_notification');

      this.logger.log(`[Login Step 5/5] Generated mfa_pending token. Allowed methods: ${allowedMethods.join(', ')}`);
      return {
        mfaRequired: true,
        allowedMethods,
        tempToken,
        devices: user.devices.map(d => ({ id: d.id, deviceName: d.deviceName })),
      } as any; // Cast to bypass compiler return warnings
    }

    this.logger.log(`[Login Step 5/5] MFA is not enabled for user: ${user.username}. Directly signing login session token...`);
    const token = await this.signToken(user);
    this.logger.log(`[Login Step 5/5] Login session token signed successfully. Returning session for user: ${user.username}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        permissions: user.permissions,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        passwordChangedAt: user.passwordChangedAt,
      },
      token,
    };
  }

  public async verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  public async sendMfaEmailCode(tempToken: string) {
    let payload;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.type !== 'mfa_pending' || !payload.sub) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub as string },
    });
    if (!user || !user.emailMfaEnabled) {
      throw new UnauthorizedException('MFA not authorized or not active');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`mfa-email-code:${user.id}`, code, 300);

    await this.mailService.sendMail(
      user.email,
      'Runa - Verification Code',
      `Your login verification code is: ${code}. This code is valid for 5 minutes.`,
    );

    return { success: true };
  }

  public async sendDeviceMfaCode(tempToken: string, deviceId: string) {
    let payload;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.type !== 'mfa_pending' || !payload.sub) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const userId = payload.sub as string;
    const device = await this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device || !device.identityKey) {
      throw new UnauthorizedException('Device not found or not capable of receiving encrypted notifications');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`mfa-device-code:${userId}`, code, 300); // 5 min TTL

    const dataKey = generateDataKey();
    const encryptedMessage = encryptWithDataKey(`Your login verification code is: ${code}`, dataKey);
    const encryptedTitle = encryptWithDataKey('Device Login Request', dataKey);
    const encryptedKeyPayload = encryptDataKeyForUser(device.identityKey, dataKey);

    await this.prisma.client.notification.create({
      data: {
        userId,
        title: encryptedTitle,
        message: encryptedMessage,
        type: 'INFO',
        status: 'PENDING',
        metadata: {
          encryptedKey: encryptedKeyPayload,
          targetDeviceId: device.id,
        } as any,
      },
    });

    return { success: true };
  }

  public async verifyMfa(
    tempToken: string,
    method: string,
    code?: string,
    passkeyResponse?: any,
  ) {
    this.logger.log(`[MFA Verification] Starting verification. Method: ${method}, hasCode: ${!!code}, hasPasskeyResponse: ${!!passkeyResponse}`);
    let payload;
    try {
      this.logger.log(`[MFA Verification] Verifying tempToken signature...`);
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
      this.logger.log(`[MFA Verification] tempToken verified. Sub (User ID): ${payload.sub}, Type: ${payload.type}`);
    } catch (err: any) {
      this.logger.warn(`[MFA Verification] tempToken verification failed: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    if (payload.type !== 'mfa_pending' || !payload.sub) {
      this.logger.warn(`[MFA Verification] Token payload invalid. Type: ${payload.type}, Sub: ${payload.sub}`);
      throw new UnauthorizedException('Invalid MFA token');
    }

    const userId = payload.sub as string;
    this.logger.log(`[MFA Verification] Fetching user ${userId} from database...`);
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) {
      this.logger.warn(`[MFA Verification] User ${userId} not found in database.`);
      throw new UnauthorizedException('User not found');
    }
    this.logger.log(`[MFA Verification] User found: ${user.username}. Beginning verification of method: ${method}`);

    let isVerified = false;

    if (method === 'totp') {
      if (!user.totpEnabled || !user.totpSecret) {
        this.logger.warn(`[MFA Verification - TOTP] TOTP is not enabled for user: ${user.username}`);
        throw new UnauthorizedException('TOTP is not enabled');
      }
      if (!code) {
        this.logger.warn(`[MFA Verification - TOTP] Verification code missing.`);
        throw new BadRequestException('Verification code is required');
      }
      this.logger.log(`[MFA Verification - TOTP] Decrypting user TOTP secret key...`);
      let decryptedSecret: string;
      try {
        decryptedSecret = decrypt(user.totpSecret);
      } catch (err: any) {
        this.logger.error(`[MFA Verification - TOTP] Failed to decrypt TOTP secret for user ${userId}. Error: ${err.message}`);
        throw new UnauthorizedException('Failed to decrypt authentication secret. The server encryption key may have changed.');
      }
      this.logger.log(`[MFA Verification - TOTP] Verifying TOTP token: ${code}`);
      const verifyResult = await verify({ token: code, secret: decryptedSecret });
      isVerified = verifyResult.valid;
      this.logger.log(`[MFA Verification - TOTP] Verification result: ${isVerified}`);
    } else if (method === 'email') {
      if (!user.emailMfaEnabled) {
        this.logger.warn(`[MFA Verification - Email] Email MFA is not enabled for user: ${user.username}`);
        throw new UnauthorizedException('Email MFA is not enabled');
      }
      if (!code) {
        this.logger.warn(`[MFA Verification - Email] Verification code missing.`);
        throw new BadRequestException('Verification code is required');
      }
      this.logger.log(`[MFA Verification - Email] Fetching cached email code for user ${userId}...`);
      const cachedCode = await this.cacheService.get<string>(`mfa-email-code:${userId}`);
      isVerified = cachedCode === code;
      this.logger.log(`[MFA Verification - Email] Cached code: ${cachedCode ? 'exists' : 'does not exist'}. Matching result: ${isVerified}`);
      if (isVerified) {
        await this.cacheService.del(`mfa-email-code:${userId}`);
      }
    } else if (method === 'device_notification') {
      if (!code) {
        this.logger.warn(`[MFA Verification - Device] Verification code missing.`);
        throw new BadRequestException('Verification code is required');
      }
      this.logger.log(`[MFA Verification - Device] Fetching cached device code for user ${userId}...`);
      const cachedCode = await this.cacheService.get<string>(`mfa-device-code:${userId}`);
      isVerified = cachedCode === code;
      this.logger.log(`[MFA Verification - Device] Cached code: ${cachedCode ? 'exists' : 'does not exist'}. Matching result: ${isVerified}`);
      if (isVerified) {
        await this.cacheService.del(`mfa-device-code:${userId}`);
      }
    } else if (method === 'backup') {
      if (user.backupCodes.length === 0) {
        this.logger.warn(`[MFA Verification - Backup] Backup codes are not enabled for user: ${user.username}`);
        throw new UnauthorizedException('Backup codes are not enabled');
      }
      if (!code) {
        this.logger.warn(`[MFA Verification - Backup] Verification code missing.`);
        throw new BadRequestException('Verification code is required');
      }

      this.logger.log(`[MFA Verification - Backup] Comparing code against ${user.backupCodes.length} backup codes...`);
      let matchedIndex = -1;
      for (let i = 0; i < user.backupCodes.length; i++) {
        const matches = await bcrypt.compare(code, user.backupCodes[i]);
        if (matches) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        isVerified = true;
        this.logger.log(`[MFA Verification - Backup] Code matched at index: ${matchedIndex}. Removing used backup code...`);
        const updatedCodes = user.backupCodes.filter((_, idx) => idx !== matchedIndex);
        await this.prisma.client.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes },
        });
      } else {
        this.logger.warn(`[MFA Verification - Backup] Provided code did not match any backup codes.`);
      }
    } else if (method === 'passkey') {
      if (user.passkeys.length === 0) {
        this.logger.warn(`[MFA Verification - Passkey] Passkeys are not registered for user: ${user.username}`);
        throw new UnauthorizedException('Passkeys are not registered');
      }
      if (!passkeyResponse) {
        this.logger.warn(`[MFA Verification - Passkey] Passkey assertion response missing.`);
        throw new BadRequestException('Passkey assertion response is required');
      }

      this.logger.log(`[MFA Verification - Passkey] Fetching challenge for user ${userId}...`);
      const expectedChallenge = await this.cacheService.get<string>(`passkey-auth-challenge:${userId}`);
      if (!expectedChallenge) {
        this.logger.warn(`[MFA Verification - Passkey] Challenge expired or not found.`);
        throw new BadRequestException('Passkey authentication challenge expired');
      }

      const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;
      const expectedOrigin = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

      const passkey = user.passkeys.find((pk) => pk.id === passkeyResponse.id);
      if (!passkey) {
        this.logger.warn(`[MFA Verification - Passkey] Passkey credential with ID ${passkeyResponse.id} not recognized.`);
        throw new UnauthorizedException('Credential not recognized');
      }

      this.logger.log(`[MFA Verification - Passkey] Verifying authentication response (RPID: ${rpID}, Origin: ${expectedOrigin})...`);
      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: passkeyResponse,
          expectedChallenge,
          expectedOrigin,
          expectedRPID: rpID,
          credential: {
            id: passkey.id,
            publicKey: Buffer.from(passkey.publicKey, 'base64url'),
            counter: passkey.counter,
            transports: passkey.transports as any,
          },
        });
      } catch (err: any) {
        this.logger.error(`[MFA Verification - Passkey] SimpleWebAuthn verification error: ${err.message}`, err.stack);
        throw new UnauthorizedException(err.message || 'Passkey verification failed');
      }

      if (verification.verified && verification.authenticationInfo) {
        isVerified = true;
        this.logger.log(`[MFA Verification - Passkey] Passkey verified successfully. Updating counter to: ${verification.authenticationInfo.newCounter}`);
        await this.prisma.client.passkey.update({
          where: { id: passkey.id },
          data: { counter: verification.authenticationInfo.newCounter },
        });
      } else {
        this.logger.warn(`[MFA Verification - Passkey] Verification signature is invalid.`);
      }

      await this.cacheService.del(`passkey-auth-challenge:${userId}`);
    }

    if (!isVerified) {
      this.logger.warn(`[MFA Verification] Verification failed for user ${user.username} using method: ${method}`);
      throw new UnauthorizedException('Invalid verification code or response');
    }

    this.logger.log(`[MFA Verification] Verification successful for user: ${user.username}. Generating mfa_success token...`);
    const mfaSuccessToken = await new SignJWT({
      sub: user.id,
      type: 'mfa_success',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.secret);

    this.logger.log(`[MFA Verification] Successfully generated mfa_success token. Expiration: 5 minutes.`);
    return { success: true, mfaSuccessToken };
  }

  public async generatePasskeyLoginOptions(identifier?: string) {
    let user: (User & { passkeys: Passkey[] }) | null = null;
    let allowCredentials: { id: string; type: 'public-key'; transports?: any[] }[] | undefined = undefined;

    if (identifier) {
      user = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
        include: {
          passkeys: true,
        },
      });
      if (user) {
        allowCredentials = user.passkeys.map((pk) => ({
          id: pk.id,
          type: 'public-key' as const,
          transports: pk.transports as any,
        }));
      }
    }

    const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    if (user) {
      await this.cacheService.set(`passkey-auth-challenge:${user.id}`, options.challenge, 300);
    } else {
      await this.cacheService.set(`global-passkey-challenge:${options.challenge}`, options.challenge, 300);
    }

    return {
      options,
      userId: user?.id,
    };
  }

  public async verifyPasskeyLogin(identifier: string | undefined, assertionResponse: any) {
    let user: (User & { passkeys: Passkey[] }) | null = null;

    if (identifier) {
      user = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
        include: {
          passkeys: true,
        },
      });
    }

    if (!user) {
      const passkeyDb = await this.prisma.client.passkey.findUnique({
        where: { id: assertionResponse.id },
        include: { user: { include: { passkeys: true } } },
      });
      if (passkeyDb) {
        user = passkeyDb.user;
      }
    }

    if (!user) throw new NotFoundException('User not found');

    let expectedChallenge = await this.cacheService.get<string>(`passkey-auth-challenge:${user.id}`);
    if (!expectedChallenge) {
      try {
        const clientData = JSON.parse(Buffer.from(assertionResponse.response.clientDataJSON, 'base64url').toString('utf8'));
        const challenge = clientData.challenge;
        expectedChallenge = await this.cacheService.get<string>(`global-passkey-challenge:${challenge}`);
      } catch (e) {
        // Ignored
      }
    }

    if (!expectedChallenge) {
      throw new BadRequestException('Passkey authentication challenge expired');
    }

    const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;
    const expectedOrigin = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const passkey = user.passkeys.find((pk) => pk.id === assertionResponse.id);
    if (!passkey) {
      throw new UnauthorizedException('Credential not recognized');
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: Buffer.from(passkey.publicKey, 'base64url'),
          counter: passkey.counter,
          transports: passkey.transports as any,
        },
      });
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Passkey verification failed');
    }

    if (!verification.verified || !verification.authenticationInfo) {
      throw new UnauthorizedException('Passkey verification failed');
    }

    await this.prisma.client.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter },
    });

    await this.cacheService.del(`passkey-auth-challenge:${user.id}`);
    await this.cacheService.del(`global-passkey-challenge:${expectedChallenge}`);

    const token = await this.signToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        permissions: user.permissions,
        avatarUrl: user.avatarUrl,
        displayName: user.displayName,
        passwordChangedAt: user.passwordChangedAt,
      },
      token,
    };
  }

  private async signToken(user: any) {
    return await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.username,
      permissions: user.permissions,
      avatarUrl: user.avatarUrl,
      displayName: user.displayName,
      passwordChangedAt: user.passwordChangedAt,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }
}
