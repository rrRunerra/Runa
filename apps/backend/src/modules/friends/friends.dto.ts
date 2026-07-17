import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsString({ message: 'SeFqDto-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'SeFqDto-UMNBE001: Username must not be empty' })
  username!: string;
}

export class UpdateFriendDto {
  @IsString({ message: 'UeFdDto-NNBAS001: Nickname must be a string' })
  @IsOptional()
  @MaxLength(64, { message: 'UeFdDto-NNBALTC001: Nickname must be at most 64 characters long' })
  nickname?: string;

  @IsString({ message: 'UeFdDto-NEBAS001: Note must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'UeFdDto-NEBALTC001: Note must be at most 255 characters long' })
  note?: string;
}

export class RequestIdParamDto {
  @IsString({ message: 'RqIdPm-IMBAS001: Request ID must be a string' })
  @IsNotEmpty({ message: 'RqIdPm-IMNBE001: Request ID must not be empty' })
  requestId!: string;
}

export class FriendIdParamDto {
  @IsString({ message: 'FdIdPm-IMBAS001: Friend ID must be a string' })
  @IsNotEmpty({ message: 'FdIdPm-IMNBE001: Friend ID must not be empty' })
  friendId!: string;
}

export class UsernameParamDto {
  @IsString({ message: 'UePm-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'UePm-UMNBE001: Username must not be empty' })
  username!: string;
}
