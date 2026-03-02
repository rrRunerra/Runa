import { Controller, UseGuards, Post } from '@nestjs/common';
import { TypedRoute, TypedBody } from '@nestia/core';
import { UserService } from './user.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { User } from '@runa/database';
import { Public } from '../../common/decorators/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('user')
@UseGuards(DualAuthGuard)
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Public()
  @TypedRoute.Post('create')
  create(@TypedBody() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }
}
