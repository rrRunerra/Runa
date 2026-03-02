import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { User } from '@runa/database';
import { CreateUserDto } from './dto/create-user.dto';
import bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(UserService.name);

  async create(data: CreateUserDto): Promise<User> {
    const existing = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username.toLowerCase() }],
      },
    });
    const errors: string[] = [];

    if (existing?.email.toLowerCase() === data.email.toLowerCase()) {
      errors.push('Email is already taken.');
    }

    if (existing?.username.toLowerCase() === data.username.toLowerCase()) {
      errors.push('Username is already taken.');
    }

    if (errors.length > 0) {
      throw new ConflictException(errors);
    }

    const hasAdmin = await this.prisma.client.user.findFirst({
      where: {
        role: 'ADMIN',
      },
    });

    const passHash = await bcrypt.hash(data.password, 10);

    return await this.prisma.client.user
      .create({
        data: {
          email: data.email.toLowerCase(),
          username: data.username.toLowerCase(),
          passwordHash: passHash,
          role: hasAdmin ? 'USER' : 'ADMIN',
        },
      })
      .catch((err) => {
        this.logger.error(err);
        throw new BadRequestException('Failed to create user');
      });
  }
}
