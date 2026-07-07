import { Injectable, Logger } from '@nestjs/common';
import {
  rrBadRequestException,
  rrNotFoundException,
  rrUnauthorizedException,
} from 'src/providers/error';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import { decrypt } from '@runa/crypto/server';
import {
  generateDataKey,
  encrypt,
  wrapKey,
} from '@runa/crypto/node';
import { verify } from 'otplib';
import bcrypt from 'bcrypt';
import type { User, Passkey } from '@runa/database';
import { LoginAuthDto } from './auth.dto';
import type {
  AuthResponseEntity,
  MfaRequiredEntity,
  LoginCodeEntity,
  LoginCodeStatusEntity,
} from './auth.entities';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  VerifiedAuthenticationResponse,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

interface MfaTokenPayload {
  sub?: string;
  type?: string;
  [key: string]: unknown;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly moduleCode = 'AhSve-';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
  ) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  public async login(
    data: LoginAuthDto,
  ): Promise<AuthResponseEntity | MfaRequiredEntity> {
    // 1. Check if MFA Success Token is provided (from client after MFA verify succeeded)
    if (data.mfaSuccessToken) {
      try {
        const { payload } = await jwtVerify(data.mfaSuccessToken, this.secret, {
          algorithms: ['HS256'],
        });
        const tokenPayload = payload as MfaTokenPayload;
        if (tokenPayload.type !== 'mfa_success' || !tokenPayload.sub) {
          throw new rrUnauthorizedException(`${this.moduleCode}IMST001`, {
            message: 'Invalid MFA success token',
          });
        }

        const user = await this.prisma.client.user.findUnique({
          where: { id: tokenPayload.sub },
        });

        if (!user) {
          throw new rrUnauthorizedException(`${this.moduleCode}UNF001`, {
            message: 'User not found',
          });
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
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'MFA verification failed';
        this.logger.error(
          `[Login Step 1/5] MFA success token verification failed: ${errorMessage}`,
          err instanceof Error ? err.stack : undefined,
        );
        throw new rrUnauthorizedException(`${this.moduleCode}MVEOI001`, {
          message: errorMessage,
        });
      }
    }

    // 1.5. Check if this is a Passwordless Login Code verification
    if (data.isLoginCode === 'true' && data.loginCode) {
      return this.verifyLoginCode(data.loginCode);
    }

    // 2. Check if this is a Passwordless Passkey direct login
    if (data.isPasskeyOnly === 'true' && data.passkeyResponse) {
      let parsedResponse: AuthenticationResponseJSON;
      try {
        parsedResponse = JSON.parse(
          data.passkeyResponse,
        ) as AuthenticationResponseJSON;
      } catch {
        throw new rrBadRequestException(`${this.moduleCode}IPARF001`, {
          message: 'Invalid passkey assertion response format',
        });
      }
      return this.verifyPasskeyLogin(data.identifier, parsedResponse);
    }

    // 3. Locate User by Username or Email
    if (!data.identifier) {
      throw new rrBadRequestException(`${this.moduleCode}IIR001`, {
        message: 'Identifier is required',
      });
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
      throw new rrUnauthorizedException(`${this.moduleCode}UNF002`, {
        message: 'User not found',
      });
    }

    // 4. Verify password
    if (!data.password) {
      throw new rrUnauthorizedException(`${this.moduleCode}PIR001`, {
        message: 'Password is required',
      });
    }

    const passHash = await bcrypt.compare(data.password, user.passwordHash);

    if (!passHash) {
      throw new rrUnauthorizedException(`${this.moduleCode}IP001`, {
        message: 'Invalid password',
      });
    }

    // 5. Check if MFA is active for this user
    const hasPasskeys = user.passkeys.length > 0;
    const hasDevices = user.devices.length > 0;
    const isMfaActive =
      user.totpEnabled || user.emailMfaEnabled || hasPasskeys || hasDevices;

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
        devices: user.devices.map((d) => ({
          id: d.id,
          deviceName: d.deviceName,
        })),
      };
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

  public async verifyToken(token: string): Promise<Record<string, unknown>> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      });
      return payload;
    } catch {
      throw new rrUnauthorizedException(`${this.moduleCode}IT001`, {
        message: 'Invalid token',
      });
    }
  }

  public async sendMfaEmailCode(
    tempToken: string,
  ): Promise<{ success: boolean }> {
    let tokenPayload: MfaTokenPayload | null = null;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      tokenPayload = result.payload;
    } catch {
      throw new rrUnauthorizedException(`${this.moduleCode}IOEMT001`, {
        message: 'Invalid or expired MFA token',
      });
    }

    if (tokenPayload.type !== 'mfa_pending' || !tokenPayload.sub) {
      throw new rrUnauthorizedException(`${this.moduleCode}IMT001`, {
        message: 'Invalid MFA token',
      });
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: tokenPayload.sub },
    });
    if (!user || !user.emailMfaEnabled) {
      throw new rrUnauthorizedException(`${this.moduleCode}MNAONA001`, {
        message: 'MFA not authorized or not active',
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`mfa-email-code:${user.id}`, code, 300);

    await this.mailService.sendMail(
      user.email,
      'Runa - Verification Code',
      `Your login verification code is: ${code}. This code is valid for 5 minutes.`,
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 48px 24px; text-align: center; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #27272a;">
  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #ffffff; margin: 0; text-transform: uppercase;">Polaris</h2>
    <div style="font-size: 11px; color: #a1a1aa; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px;">Account Security</div>
  </div>
  
  <div style="background-color: #18181b; border: 1px solid #27272a; padding: 32px; border-radius: 12px; margin-bottom: 32px;">
    <h3 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #ffffff;">Login Verification Code</h3>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
      Use the verification code below to complete your Multi-Factor Authentication and sign in to Polaris.
    </p>
    
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #3b82f6; background-color: #09090b; border: 1px solid #27272a; padding: 16px 24px; border-radius: 8px; display: inline-block; margin-bottom: 24px;">
      ${code}
    </div>
    
    <p style="font-size: 12px; color: #71717a; margin: 0;">
      This code is valid for <strong>5 minutes</strong>.
    </p>
  </div>
  
  <div style="font-size: 12px; color: #71717a; line-height: 1.5; text-align: left; max-width: 440px; margin: 0 auto;">
    <p style="margin-bottom: 8px;"><strong>Security notice:</strong> If you did not request this code, please ignore this email or contact support if you suspect unauthorized access.</p>
    <p style="margin: 0; text-align: center; font-size: 11px; margin-top: 24px; color: #52525b;">&copy; ${new Date().getFullYear()} Runa. All rights reserved.</p>
  </div>
</div>`
    );

    return { success: true };
  }

  public async sendMfaRecoveryCode(
    tempToken: string,
  ): Promise<{ success: boolean }> {
    let tokenPayload: MfaTokenPayload | null = null;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      tokenPayload = result.payload;
    } catch {
      throw new rrUnauthorizedException(`${this.moduleCode}IOEMT004`, {
        message: 'Invalid or expired MFA token',
      });
    }

    if (tokenPayload.type !== 'mfa_pending' || !tokenPayload.sub) {
      throw new rrUnauthorizedException(`${this.moduleCode}IMT004`, {
        message: 'Invalid MFA token',
      });
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: tokenPayload.sub },
    });
    if (!user) {
      throw new rrUnauthorizedException(`${this.moduleCode}UNF005`, {
        message: 'User not found',
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`mfa-recovery-code:${user.id}`, code, 300);

    await this.mailService.sendMail(
      user.email,
      'Runa - Account Recovery',
      `Your account recovery verification code is: ${code}. Enter this code to bypass MFA and complete your login. This code is valid for 5 minutes.`,
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 48px 24px; text-align: center; border-radius: 16px; max-width: 520px; margin: 0 auto; border: 1px solid #27272a;">
  <div style="margin-bottom: 32px;">
    <h2 style="font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #ffffff; margin: 0; text-transform: uppercase;">Polaris</h2>
    <div style="font-size: 11px; color: #a1a1aa; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px;">Account Security</div>
  </div>
  
  <div style="background-color: #18181b; border: 1px solid #27272a; padding: 32px; border-radius: 12px; margin-bottom: 32px;">
    <h3 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px; color: #ffffff;">Account Recovery Code</h3>
    <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
      Use the verification code below to bypass Multi-Factor Authentication and access your Runa account.
    </p>
    
    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #3b82f6; background-color: #09090b; border: 1px solid #27272a; padding: 16px 24px; border-radius: 8px; display: inline-block; margin-bottom: 24px;">
      ${code}
    </div>
    
    <p style="font-size: 12px; color: #71717a; margin: 0;">
      This code is valid for <strong>5 minutes</strong>.
    </p>
  </div>
  
  <div style="font-size: 12px; color: #71717a; line-height: 1.5; text-align: left; max-width: 440px; margin: 0 auto;">
    <p style="margin-bottom: 8px;"><strong>Security notice:</strong> If you did not request this code, someone else may be trying to access your account. Please log in immediately and update your password.</p>
    <p style="margin: 0; text-align: center; font-size: 11px; margin-top: 24px; color: #52525b;">&copy; ${new Date().getFullYear()} Runa. All rights reserved.</p>
  </div>
</div>`
    );

    return { success: true };
  }

  public async sendDeviceMfaCode(
    tempToken: string,
    deviceId: string,
  ): Promise<{ success: boolean }> {
    let tokenPayload: MfaTokenPayload | null = null;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      tokenPayload = result.payload;
    } catch {
      throw new rrUnauthorizedException(`${this.moduleCode}IOEMT002`, {
        message: 'Invalid or expired MFA token',
      });
    }

    if (tokenPayload.type !== 'mfa_pending' || !tokenPayload.sub) {
      throw new rrUnauthorizedException(`${this.moduleCode}IMT002`, {
        message: 'Invalid MFA token',
      });
    }

    const userId = tokenPayload.sub;
    const device = await this.prisma.client.device.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device || !device.identityKey) {
      throw new rrUnauthorizedException(`${this.moduleCode}DNFOOCOREN001`, {
        message:
          'Device not found or not capable of receiving encrypted notifications',
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheService.set(`mfa-device-code:${userId}`, code, 300); // 5 min TTL

    const dataKey = generateDataKey();
    const encryptedMessage = encrypt(
      `Your login verification code is: ${code}`,
      dataKey,
    );
    const encryptedTitle = encrypt('Device Login Request', dataKey);
    const encryptedKeyPayload = wrapKey(
      dataKey,
      device.identityKey,
    );

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
        } as Record<string, unknown>,
      },
    });

    return { success: true };
  }

  public async verifyMfa(
    tempToken: string,
    method: string,
    code?: string,
    passkeyResponse?: AuthenticationResponseJSON,
  ): Promise<{ success: boolean; mfaSuccessToken: string }> {
    let tokenPayload: MfaTokenPayload | null = null;
    try {
      const result = await jwtVerify(tempToken, this.secret, {
        algorithms: ['HS256'],
      });
      tokenPayload = result.payload;
    } catch {
      throw new rrUnauthorizedException(`${this.moduleCode}IOEMT003`, {
        message: 'Invalid or expired MFA token',
      });
    }

    if (tokenPayload.type !== 'mfa_pending' || !tokenPayload.sub) {
      throw new rrUnauthorizedException(`${this.moduleCode}IMT003`, {
        message: 'Invalid MFA token',
      });
    }

    const userId = tokenPayload.sub;
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { passkeys: true },
    });
    if (!user) {
      throw new rrUnauthorizedException(`${this.moduleCode}UNF003`, {
        message: 'User not found',
      });
    }

    let isVerified = false;

    if (method === 'totp') {
      if (!user.totpEnabled || !user.totpSecret) {
        throw new rrUnauthorizedException(`${this.moduleCode}TINE001`, {
          message: 'TOTP is not enabled',
        });
      }
      if (!code)
        throw new rrBadRequestException(`${this.moduleCode}VCIR001`, {
          message: 'Verification code is required',
        });
      let decryptedSecret: string;
      try {
        decryptedSecret = decrypt(user.totpSecret);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to decrypt TOTP secret for user ${userId}. This usually means NEXTAUTH_SECRET changed or is mismatched. Error: ${errorMessage}`,
        );
        throw new rrUnauthorizedException(`${this.moduleCode}FTDAS001`, {
          message:
            'Failed to decrypt authentication secret. The server encryption key may have changed.',
        });
      }
      const verifyResult = await verify({
        token: code,
        secret: decryptedSecret,
      });
      isVerified = verifyResult.valid;
    } else if (method === 'email') {
      if (!user.emailMfaEnabled) {
        throw new rrUnauthorizedException(`${this.moduleCode}EMINE001`, {
          message: 'Email MFA is not enabled',
        });
      }
      if (!code)
        throw new rrBadRequestException(`${this.moduleCode}VCIR002`, {
          message: 'Verification code is required',
        });
      const cachedCode = await this.cacheService.get<string>(
        `mfa-email-code:${userId}`,
      );
      isVerified = cachedCode !== null && String(cachedCode) === code;
      if (isVerified) {
        await this.cacheService.del(`mfa-email-code:${userId}`);
      }
    } else if (method === 'device_notification') {
      if (!code)
        throw new rrBadRequestException(`${this.moduleCode}VCIR003`, {
          message: 'Verification code is required',
        });
      const cachedCode = await this.cacheService.get<string>(
        `mfa-device-code:${userId}`,
      );
      isVerified = cachedCode !== null && String(cachedCode) === code;
      if (isVerified) {
        await this.cacheService.del(`mfa-device-code:${userId}`);
      }
    } else if (method === 'recovery') {
      if (!code)
        throw new rrBadRequestException(`${this.moduleCode}VCIR005`, {
          message: 'Verification code is required',
        });
      const cachedCode = await this.cacheService.get<string>(
        `mfa-recovery-code:${userId}`,
      );
      isVerified = cachedCode !== null && String(cachedCode) === code;
      if (isVerified) {
        await this.cacheService.del(`mfa-recovery-code:${userId}`);
      }
    } else if (method === 'backup') {
      if (user.backupCodes.length === 0) {
        throw new rrUnauthorizedException(`${this.moduleCode}BCANE001`, {
          message: 'Backup codes are not enabled',
        });
      }
      if (!code)
        throw new rrBadRequestException(`${this.moduleCode}VCIR004`, {
          message: 'Verification code is required',
        });

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
        const updatedCodes = user.backupCodes.filter(
          (_, idx) => idx !== matchedIndex,
        );
        await this.prisma.client.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes },
        });
      }
    } else if (method === 'passkey') {
      if (user.passkeys.length === 0) {
        throw new rrUnauthorizedException(`${this.moduleCode}PANR001`, {
          message: 'Passkeys are not registered',
        });
      }
      if (!passkeyResponse) {
        throw new rrBadRequestException(`${this.moduleCode}PAIRIR001`, {
          message: 'Passkey assertion response is required',
        });
      }

      const expectedChallenge = await this.cacheService.get<string>(
        `passkey-auth-challenge:${userId}`,
      );
      if (!expectedChallenge) {
        throw new rrBadRequestException(`${this.moduleCode}PACE001`, {
          message: 'Passkey authentication challenge expired',
        });
      }

      const rpID =
        process.env.RP_ID ||
        new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000')
          .hostname;
      const expectedOrigin =
        process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

      const passkey = user.passkeys.find((pk) => pk.id === passkeyResponse.id);
      if (!passkey) {
        throw new rrUnauthorizedException(`${this.moduleCode}CNR001`, {
          message: 'Credential not recognized',
        });
      }

      let verification: VerifiedAuthenticationResponse;
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
            transports: passkey.transports as AuthenticatorTransportFuture[],
          },
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Passkey verification failed';
        throw new rrUnauthorizedException(`${this.moduleCode}PVF001`, {
          message: errorMessage,
        });
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
      throw new rrUnauthorizedException(`${this.moduleCode}IVCOR001`, {
        message: 'Invalid verification code or response',
      });
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

  public async generatePasskeyLoginOptions(identifier?: string): Promise<{
    options: PublicKeyCredentialRequestOptionsJSON;
    userId: string | undefined;
  }> {
    let user: (User & { passkeys: Passkey[] }) | null = null;
    let allowCredentials:
      | { id: string; type: 'public-key'; transports?: any[] }[]
      | undefined = undefined;

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
          transports: pk.transports,
        }));
      }
    }

    const rpID =
      process.env.RP_ID ||
      new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    if (user) {
      await this.cacheService.set(
        `passkey-auth-challenge:${user.id}`,
        options.challenge,
        300,
      );
    } else {
      await this.cacheService.set(
        `global-passkey-challenge:${options.challenge}`,
        options.challenge,
        300,
      );
    }

    return {
      options,
      userId: user?.id,
    };
  }

  public async verifyPasskeyLogin(
    identifier: string | undefined,
    assertionResponse: AuthenticationResponseJSON,
  ): Promise<AuthResponseEntity> {
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

    if (!user)
      throw new rrNotFoundException(`${this.moduleCode}UNF004`, {
        message: 'User not found',
      });

    let expectedChallenge = await this.cacheService.get<string>(
      `passkey-auth-challenge:${user.id}`,
    );
    if (!expectedChallenge) {
      try {
        const clientData = JSON.parse(
          Buffer.from(
            assertionResponse.response.clientDataJSON,
            'base64url',
          ).toString('utf8'),
        ) as { challenge: string };
        const challenge = clientData.challenge;
        expectedChallenge = await this.cacheService.get<string>(
          `global-passkey-challenge:${challenge}`,
        );
      } catch {
        // Ignored
      }
    }

    if (!expectedChallenge) {
      throw new rrBadRequestException(`${this.moduleCode}PACE002`, {
        message: 'Passkey authentication challenge expired',
      });
    }

    const rpID =
      process.env.RP_ID ||
      new URL(process.env.NEXT_PUBLIC_URL || 'http://localhost:3000').hostname;
    const expectedOrigin =
      process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const passkey = user.passkeys.find((pk) => pk.id === assertionResponse.id);
    if (!passkey) {
      throw new rrUnauthorizedException(`${this.moduleCode}CNR002`, {
        message: 'Credential not recognized',
      });
    }

    let verification: VerifiedAuthenticationResponse;
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
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Passkey verification failed';
      throw new rrUnauthorizedException(`${this.moduleCode}PVF002`, {
        message: errorMessage,
      });
    }

    if (!verification.verified || !verification.authenticationInfo) {
      throw new rrUnauthorizedException(`${this.moduleCode}PVF003`, {
        message: 'Passkey verification failed',
      });
    }

    await this.prisma.client.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter },
    });

    await this.cacheService.del(`passkey-auth-challenge:${user.id}`);
    await this.cacheService.del(
      `global-passkey-challenge:${expectedChallenge}`,
    );

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

  public async generateLoginCode(): Promise<LoginCodeEntity> {
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
      throw new rrBadRequestException(`${this.moduleCode}CNGAULC001`, {
        message: 'Could not generate a unique login code',
      });
    }

    await this.cacheService.set(
      `login-code:${code}`,
      { status: 'PENDING' },
      300,
    );

    return { code };
  }

  public async getLoginCodeStatus(
    code: string,
  ): Promise<LoginCodeStatusEntity> {
    const data = await this.cacheService.get<{ status: string }>(
      `login-code:${code}`,
    );
    if (!data) {
      return { status: 'EXPIRED' };
    }
    return { status: data.status };
  }

  public async linkLoginCode(
    userId: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const cacheKey = `login-code:${code}`;
    const data = await this.cacheService.get<{ status: string }>(cacheKey);

    if (!data || data.status !== 'PENDING') {
      throw new rrBadRequestException(`${this.moduleCode}IOELC001`, {
        message: 'Invalid or expired login code',
      });
    }

    await this.cacheService.set(cacheKey, { status: 'APPROVED', userId }, 300);

    return { success: true };
  }

  public async verifyLoginCode(code: string): Promise<AuthResponseEntity> {
    const cacheKey = `login-code:${code}`;
    const cached = await this.cacheService.get<{
      status: string;
      userId?: string;
    }>(cacheKey);

    if (!cached || cached.status !== 'APPROVED' || !cached.userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}IOELC002`, {
        message: 'Invalid or expired login code',
      });
    }

    await this.cacheService.del(cacheKey);

    const user = await this.prisma.client.user.findUnique({
      where: { id: cached.userId },
    });

    if (!user) {
      throw new rrUnauthorizedException(`${this.moduleCode}UNF005`, {
        message: 'User not found',
      });
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

  private async signToken(user: User): Promise<string> {
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
