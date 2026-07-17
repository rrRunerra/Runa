import { Controller, UseGuards, Post, Body, Get, Param, Put, Delete, Req, Query } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';
import { FriendsService } from './friends.service';
import {
  SendFriendRequestDto,
  UpdateFriendDto,
  RequestIdParamDto,
  FriendIdParamDto,
  UsernameParamDto,
} from './friends.dto';
import type {
  FriendRequestEntity,
  FriendEntity,
  FriendshipStateEntity,
  UserMiniEntity,
} from './friends.entities';

@Controller('friends')
export class FriendsController {
  private readonly moduleCode = 'FsCtr-';

  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @UseGuards(AuthGuard)
  async sendRequest(
    @Req() req: ExtendedRequest,
    @Body() body: SendFriendRequestDto,
  ): Promise<FriendRequestEntity> {
    return this.friendsService.sendFriendRequest(req.user!.id, body.username);
  }

  @Get('requests/incoming')
  @UseGuards(AuthGuard)
  async getIncomingRequests(@Req() req: ExtendedRequest): Promise<FriendRequestEntity[]> {
    return this.friendsService.getIncomingRequests(req.user!.id);
  }

  @Get('requests/outgoing')
  @UseGuards(AuthGuard)
  async getOutgoingRequests(@Req() req: ExtendedRequest): Promise<FriendRequestEntity[]> {
    return this.friendsService.getOutgoingRequests(req.user!.id);
  }

  @Post('request/:requestId/accept')
  @UseGuards(AuthGuard)
  async acceptRequest(
    @Req() req: ExtendedRequest,
    @Param() params: RequestIdParamDto,
  ): Promise<{ success: boolean }> {
    return this.friendsService.acceptRequest(params.requestId, req.user!.id);
  }

  @Post('request/:requestId/decline')
  @UseGuards(AuthGuard)
  async declineRequest(
    @Req() req: ExtendedRequest,
    @Param() params: RequestIdParamDto,
  ): Promise<{ success: boolean }> {
    return this.friendsService.declineRequest(params.requestId, req.user!.id);
  }

  @Post('request/:requestId/cancel')
  @UseGuards(AuthGuard)
  async cancelRequest(
    @Req() req: ExtendedRequest,
    @Param() params: RequestIdParamDto,
  ): Promise<{ success: boolean }> {
    return this.friendsService.cancelRequest(params.requestId, req.user!.id);
  }

  @Get('media-progress')
  @UseGuards(AuthGuard)
  async getFriendsMediaProgress(
    @Req() req: ExtendedRequest,
    @Query('mediaId') mediaId: string,
    @Query('mediaType') mediaType: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<any[]> {
    return this.friendsService.getFriendsMediaProgress(
      req.user!.id,
      mediaId,
      mediaType,
      limit ? parseInt(limit, 10) : 5,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async getFriends(@Req() req: ExtendedRequest): Promise<FriendEntity[]> {
    return this.friendsService.getFriends(req.user!.id);
  }

  @Put(':friendId')
  @UseGuards(AuthGuard)
  async updateFriend(
    @Req() req: ExtendedRequest,
    @Param() params: FriendIdParamDto,
    @Body() body: UpdateFriendDto,
  ): Promise<FriendEntity> {
    return this.friendsService.updateFriend(req.user!.id, params.friendId, body);
  }

  @Delete(':friendId')
  @UseGuards(AuthGuard)
  async removeFriend(
    @Req() req: ExtendedRequest,
    @Param() params: FriendIdParamDto,
  ): Promise<{ success: boolean }> {
    return this.friendsService.removeFriend(req.user!.id, params.friendId);
  }

  @Public()
  @Get('user/:username')
  async getPublicFriends(@Param() params: UsernameParamDto): Promise<UserMiniEntity[]> {
    return this.friendsService.getPublicFriends(params.username);
  }

  @Get('state/:username')
  @UseGuards(AuthGuard)
  async getFriendshipState(
    @Req() req: ExtendedRequest,
    @Param() params: UsernameParamDto,
  ): Promise<FriendshipStateEntity> {
    return this.friendsService.getFriendshipState(req.user!.id, params.username);
  }
}
