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
    // 1. Check if MFA Success Token is provided (from client after MFA verify succeeded)
    if (data.mfaSuccessToken) {
      try {
        const { payload } = await jwtVerify(data.mfaSuccessToken, this.secret, {
          algorithms: ['HS256'],
        });
        if (payload.type !== 'mfa_success' || !payload.sub) {
          throw new UnauthorizedException('Invalid MFA success token');
        }

        const user = await this.prisma.client.user.findUnique({
          where: { id: payload.sub as string },
        });

        if (!user) {
          throw new UnauthorizedException('User not found');
        }

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
      } catch (err: any) {
        this.logger.error(`[Login Step 1/5] MFA success token verification failed: ${err.message}`, err.stack);
        throw new UnauthorizedException(err.message || 'MFA verification expired or invalid');
      }
    }

    // 1.5. Check if this is a Passwordless Login Code verification
    if (data.isLoginCode === 'true' && data.loginCode) {
      return this.verifyLoginCode(data.loginCode);
    }

    // 2. Check if this is a Passwordless Passkey direct login
    if (data.isPasskeyOnly === 'true' && data.passkeyResponse) {
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(data.passkeyResponse);
      } catch {
        throw new BadRequestException('Invalid passkey assertion response format');
      }
      return this.verifyPasskeyLogin(data.identifier, parsedResponse);
    }

    // 3. Locate User by Username or Email
    if (!data.identifier) {
      throw new BadRequestException('Identifier is required');
    }

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
      throw new UnauthorizedException('User not found');
    }

    // 4. Verify password
    if (!data.password) {
      throw new UnauthorizedException('Password is required');
    }

    const passHash = await bcrypt.compare(data.password, user.passwordHash);

    if (!passHash) {
      throw new UnauthorizedException('Invalid password');
    }

    // 5. Check if MFA is active for this user
    const hasPasskeys = user.passkeys.length > 0;
    const hasDevices = user.devices.length > 0;
    const isMfaActive = user.totpEnabled || user.emailMfaEnabled || hasPasskeys || hasDevices;

    if (isMfaActive) {
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

      return {
        mfaRequired: true,
        allowedMethods,
        tempToken,
        devices: user.devices.map(d => ({ id: d.id, deviceName: d.deviceName })),
      } as any; // Cast to bypass compiler return warnings
    }

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
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let isVerified = false;

    if (method === 'totp') {
      if (!user.totpEnabled || !user.totpSecret) {
        throw new UnauthorizedException('TOTP is not enabled');
      }
      if (!code) throw new BadRequestException('Verification code is required');
      let decryptedSecret: string;
      try {
        decryptedSecret = decrypt(user.totpSecret);
      } catch (err: any) {
        this.logger.error(`Failed to decrypt TOTP secret for user ${userId}. This usually means NEXTAUTH_SECRET changed or is mismatched. Error: ${err.message}`);
        throw new UnauthorizedException('Failed to decrypt authentication secret. The server encryption key may have changed.');
      }
      const verifyResult = await verify({ token: code, secret: decryptedSecret });
      isVerified = verifyResult.valid;
    } else if (method === 'email') {
      if (!user.emailMfaEnabled) {
        throw new UnauthorizedException('Email MFA is not enabled');
      }
      if (!code) throw new BadRequestException('Verification code is required');
      const cachedCode = await this.cacheService.get<string>(`mfa-email-code:${userId}`);
      isVerified = cachedCode === code;
      if (isVerified) {
        await this.cacheService.del(`mfa-email-code:${userId}`);
      }
    } else if (method === 'device_notification') {
      if (!code) throw new BadRequestException('Verification code is required');
      const cachedCode = await this.cacheService.get<string>(`mfa-device-code:${userId}`);
      isVerified = cachedCode === code;
      if (isVerified) {
        await this.cacheService.del(`mfa-device-code:${userId}`);
      }
    } else if (method === 'backup') {
      if (user.backupCodes.length === 0) {
        throw new UnauthorizedException('Backup codes are not enabled');
      }
      if (!code) throw new BadRequestException('Verification code is required');

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
        const updatedCodes = user.backupCodes.filter((_, idx) => idx !== matchedIndex);
        await this.prisma.client.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes },
        });
      }
    } else if (method === 'passkey') {
      if (user.passkeys.length === 0) {
        throw new UnauthorizedException('Passkeys are not registered');
      }
      if (!passkeyResponse) {
        throw new BadRequestException('Passkey assertion response is required');
      }

      const expectedChallenge = await this.cacheService.get<string>(`passkey-auth-challenge:${userId}`);
      if (!expectedChallenge) {
        throw new BadRequestException('Passkey authentication challenge expired');
      }

      const rpID = process.env.RP_ID || new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;
      const expectedOrigin = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

      const passkey = user.passkeys.find((pk) => pk.id === passkeyResponse.id);
      if (!passkey) {
        throw new UnauthorizedException('Credential not recognized');
      }

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
        throw new UnauthorizedException(err.message || 'Passkey verification failed');
      }

      if (verification.verified && verification.authenticationInfo) {
        isVerified = true;
        await this.prisma.client.passkey.update({
          where: { id: passkey.id },
          data: { counter: verification.authenticationInfo.newCounter },
        });
      }

      await this.cacheService.del(`passkey-auth-challenge:${userId}`);
    }

    if (!isVerified) {
      throw new UnauthorizedException('Invalid verification code or response');
    }

    const mfaSuccessToken = await new SignJWT({
      sub: user.id,
      type: 'mfa_success',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.secret);

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

  public async generateLoginCode() {
    let code = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 10) {
      code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const val = await this.cacheService.get(`login-code:${code}`);
      if (!val) {
        exists = false;
      }
      attempts++;
    }

    if (exists) {
      throw new BadRequestException('Could not generate a unique login code');
    }

    await this.cacheService.set(`login-code:${code}`, { status: 'PENDING' }, 300);

    return { code };
  }

  public async getLoginCodeStatus(code: string) {
    const data = await this.cacheService.get<{ status: string }>(`login-code:${code}`);
    if (!data) {
      return { status: 'EXPIRED' };
    }
    return { status: data.status };
  }

  public async linkLoginCode(userId: string, code: string) {
    const cacheKey = `login-code:${code}`;
    const data = await this.cacheService.get<{ status: string }>(cacheKey);

    if (!data || data.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired login code');
    }

    await this.cacheService.set(cacheKey, { status: 'APPROVED', userId }, 300);

    return { success: true };
  }

  public async verifyLoginCode(code: string) {
    const cacheKey = `login-code:${code}`;
    const cached = await this.cacheService.get<{ status: string; userId?: string }>(cacheKey);

    if (!cached || cached.status !== 'APPROVED' || !cached.userId) {
      throw new UnauthorizedException('Invalid or expired login code');
    }

    await this.cacheService.del(cacheKey);

    const user = await this.prisma.client.user.findUnique({
      where: { id: cached.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

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
