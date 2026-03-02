import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { prisma } from '@runa/database';
import bcrypt from 'bcrypt';

@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  private readonly internalApiKey = process.env.INTERNAL_API_KEY;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // API Key (Highest priority)
    const apiKey = request.headers['x-api-key'];
    if (apiKey && apiKey === this.internalApiKey) {
      request.user = { id: 'system', role: 'admin' };
      return true;
    }

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
      if (!record) throw new UnauthorizedException('API Key not found');

      const valid = await bcrypt.compare(apiKey, record.keyHash);
      if (!valid) throw new UnauthorizedException('Invalid API Key');

      void prisma.apiKey.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      });

      request.user = { id: record.user?.id, role: record.user?.role };
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token found');
    }

    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return null;
  }
}
