import { Controller, UseGuards, Post, Body } from '@nestjs/common';
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
  @Post('create')
  create(@Body() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }
}
