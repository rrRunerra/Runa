import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class EmailAccountDto {
  @IsString({ message: 'ElAtDto-ANMBAS001: Account name must be a string' })
  @IsNotEmpty({ message: 'ElAtDto-ANMNBE001: Account name must not be empty' })
  accountName: string;

  @IsString({ message: 'ElAtDto-CMBAS001: Color must be a string' })
  @IsOptional()
  color?: string;

  @IsString({ message: 'ElAtDto-SNMBAS001: Sender name must be a string' })
  @IsNotEmpty({ message: 'ElAtDto-SNMNBE001: Sender name must not be empty' })
  senderName: string;

  @IsString({ message: 'ElAtDto-EAMBAS001: Email address must be a string' })
  @IsNotEmpty({ message: 'ElAtDto-EAMNBE001: Email address must not be empty' })
  emailAddress: string;

  @IsString({ message: 'ElAtDto-LEMBAS001: Login email must be a string' })
  @IsOptional()
  loginEmail?: string | null;

  @IsString({
    message: 'ElAtDto-RTAMBAS001: Reply-to address must be a string',
  })
  @IsOptional()
  replyToAddress?: string | null;

  @IsString({ message: 'ElAtDto-OMBAS001: Organization must be a string' })
  @IsOptional()
  organization?: string | null;

  @IsString({ message: 'ElAtDto-STMBAS001: Signature text must be a string' })
  @IsOptional()
  signatureText?: string | null;

  @IsBoolean({
    message: 'ElAtDto-UHSMBB001: Use HTML signature must be a boolean',
  })
  @IsOptional()
  useHtmlSignature?: boolean;

  @IsString({ message: 'ElAtDto-IHMBAS001: IMAP host must be a string' })
  @IsNotEmpty({ message: 'ElAtDto-IHMNBE001: IMAP host must not be empty' })
  imapHost: string;

  @IsInt({ message: 'ElAtDto-IPMBAI001: IMAP port must be an integer' })
  @IsNotEmpty({ message: 'ElAtDto-IPMNBE001: IMAP port must not be empty' })
  imapPort: number;

  @IsBoolean({ message: 'ElAtDto-ISMBAB001: IMAP secure must be a boolean' })
  @IsNotEmpty({ message: 'ElAtDto-ISMNBE001: IMAP secure must not be empty' })
  imapSecure: boolean;

  @IsString({ message: 'ElAtDto-SHMBAS001: SMTP host must be a string' })
  @IsNotEmpty({ message: 'ElAtDto-SHMNBE001: SMTP host must not be empty' })
  smtpHost: string;

  @IsInt({ message: 'ElAtDto-SPMBAI001: SMTP port must be an integer' })
  @IsNotEmpty({ message: 'ElAtDto-SPMNBE001: SMTP port must not be empty' })
  smtpPort: number;

  @IsBoolean({ message: 'ElAtDto-SSMBAB001: SMTP secure must be a boolean' })
  @IsNotEmpty({ message: 'ElAtDto-SSMNBE001: SMTP secure must not be empty' })
  smtpSecure: boolean;

  @IsString({ message: 'ElAtDto-PWMBAS001: Password must be a string' })
  @IsOptional()
  password?: string;
}

export class SaveDraftDto {
  @IsString({ message: 'SvDrDto-TMBAS001: To must be a string' })
  @IsOptional()
  to?: string;

  @IsString({ message: 'SvDrDto-CCMBAS001: CC must be a string' })
  @IsOptional()
  cc?: string;

  @IsString({ message: 'SvDrDto-BCMBAS001: BCC must be a string' })
  @IsOptional()
  bcc?: string;

  @IsString({ message: 'SvDrDto-SMBAS001: Subject must be a string' })
  @IsOptional()
  subject?: string;

  @IsString({ message: 'SvDrDto-BMBAS001: Body must be a string' })
  @IsOptional()
  body?: string;

  @IsString({ message: 'SvDrDto-HMBAS001: HTML must be a string' })
  @IsOptional()
  html?: string;
}

export class SendEmailDto {
  @IsString({ message: 'SeElDto-TMBAS001: To must be a string' })
  @IsNotEmpty({ message: 'SeElDto-TMNBE001: To must not be empty' })
  to: string;

  @IsString({ message: 'SeElDto-CCMBAS001: CC must be a string' })
  @IsOptional()
  cc?: string;

  @IsString({ message: 'SeElDto-BCMBAS001: BCC must be a string' })
  @IsOptional()
  bcc?: string;

  @IsString({ message: 'SeElDto-SMBAS001: Subject must be a string' })
  @IsOptional()
  subject?: string;

  @IsString({ message: 'SeElDto-BMBAS001: Body must be a string' })
  @IsNotEmpty({ message: 'SeElDto-BMNBE001: Body must not be empty' })
  body: string;

  @IsString({ message: 'SeElDto-HMBAS001: HTML must be a string' })
  @IsOptional()
  html?: string;
}
