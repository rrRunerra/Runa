import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import bcrypt from 'bcrypt';

import { prisma } from '@runa/database';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../../providers/cache/cache.service';

@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  private readonly internalApiKey = process.env.INTERNAL_API_KEY;
  private readonly pwdChangeCache = new Map<string, { timestamp: number; lastChecked: number }>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();

    try {
      // API Key (Highest priority)
      const apiKey = request.headers['x-api-key'];
      if (apiKey) {
        const keyPrefix = apiKey.slice(0, 16);
        const record = await prisma.apiKey.findFirst({
          where: {
            keyPrefix,
          },
          include: {
            user: true,
          },
        });
        if (!record) {
          throw new UnauthorizedException('API Key not found');
        }

        const valid = await bcrypt.compare(apiKey, record.keyHash);
        if (!valid) {
          throw new UnauthorizedException('Invalid API Key');
        }

        void prisma.apiKey.update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() },
        });

        request.user = {
          id: record.user?.id,
          username: record.user?.username,
          permissions: record.user?.permissions,
        };
        return true;
      }

      const token = this.extractToken(request);

      if (token) {
        const { payload } = await jwtVerify(token, this.secret, {
          algorithms: ['HS256'],
        });

        // Verify if password has changed since token issuance (throttled to 5 minutes)
        const userId = payload.sub as string;
        const now = Date.now();
        const cached = this.pwdChangeCache.get(userId);

        let changedAt: number | null = null;

        if (cached && now - cached.lastChecked < 300000) {
          changedAt = cached.timestamp;
        } else {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { passwordChangedAt: true },
          });
          const timestamp = user?.passwordChangedAt
            ? Math.floor(user.passwordChangedAt.getTime() / 1000)
            : null;

          this.pwdChangeCache.set(userId, {
            timestamp: timestamp || 0,
            lastChecked: now,
          });
          changedAt = timestamp;
        }

        if (changedAt && payload.iat && payload.iat < changedAt) {
          throw new UnauthorizedException('Token expired due to password change');
        }

        const cacheKey = `user:permissions:${userId}`;
        let permissions = await this.cacheService.get<number[]>(cacheKey);

        if (!permissions) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { permissions: true },
          });
          permissions = user?.permissions ?? [];
          await this.cacheService.set(cacheKey, permissions, 86400);
        }

        request.user = {
          id: payload.sub,
          username: payload.name,
          email: payload.email,
          permissions,
        };
        return true;
      } else if (!isPublic) {
        throw new UnauthorizedException('No authentication token found');
      }
    } catch (error) {
      if (!isPublic) {
        throw error;
      }
    }

    if (isPublic) {
      return true;
    }

    return false;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    const url = new URL(request.url, `https://${request.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) {
      return queryToken;
    }

    return null;
  }
}
