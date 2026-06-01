import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  NotFoundException,
  Put,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { User } from '@runa/database';
import { Public } from '../../common/decorators/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('user')
@UseGuards(DualAuthGuard)
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Public()
  @Throttle({default: {limit: 1, ttl: 60000}})
  @Post('create')
  create(@Body() data: CreateUserDto): Promise<User> {
    return this.usersService.create(data);
  }

  @Public()
  @Get(':username')
  async findOne(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    // Return only public fields
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
    };
  }

  @Put('update')
  async update(@Req() req: any, @Body() data: UpdateUserDto) {
    const userId = req.user.id;
    return this.usersService.update(userId, data);
  }
}
