import { IsOptional, IsString } from 'class-validator';

export class LoginAuthDto {
  @IsString({ message: 'LnAhDto-IMBAS001: Identifier must be a string' })
  @IsOptional()
  identifier?: string;

  @IsString({ message: 'LnAhDto-PMBAS001: Password must be a string' })
  @IsOptional()
  password?: string;

  @IsString({
    message: 'LnAhDto-MSTMBAS001: Mfa success token must be a string',
  })
  @IsOptional()
  mfaSuccessToken?: string;

  @IsString({ message: 'LnAhDto-PRMBAS001: Passkey response must be a string' })
  @IsOptional()
  passkeyResponse?: string;

  @IsString({ message: 'LnAhDto-IPOMBAS001: Is passkey only must be a string' })
  @IsOptional()
  isPasskeyOnly?: string;

  @IsString({ message: 'LnAhDto-ILCMBAS001: Is login code must be a string' })
  @IsOptional()
  isLoginCode?: string;

  @IsString({ message: 'LnAhDto-LCMBAS001: Login code must be a string' })
  @IsOptional()
  loginCode?: string;
}

export class LinkLoginCodeDto {
  @IsString({ message: 'LkLCdto-CMBAS001: Code must be a string' })
  code!: string;
}
