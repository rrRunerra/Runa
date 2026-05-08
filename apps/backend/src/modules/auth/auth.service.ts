import { UnauthorizedException, Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaService } from '../../providers/database/prisma.service';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  public async login(data: LoginAuthDto) {
    const user = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.identifier }, { username: data.identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passHash = await bcrypt.compare(data.password, user.passwordHash);

    if (!passHash) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = await this.signToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
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

  private async signToken(user: any) {
    return await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
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
