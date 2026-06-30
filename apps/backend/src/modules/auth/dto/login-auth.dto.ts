import { IsString, IsOptional } from 'class-validator';

export class LoginAuthDto {
  @IsString()
  @IsOptional()
  identifier?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  mfaSuccessToken?: string;

  @IsString()
  @IsOptional()
  passkeyResponse?: string;

  @IsString()
  @IsOptional()
  isPasskeyOnly?: string;

  @IsString()
  @IsOptional()
  isLoginCode?: string;

  @IsString()
  @IsOptional()
  loginCode?: string;
}
