export interface RrMailProviderPreset {
  id: string;
  name: string;
  domainPattern?: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  color: string;
  badgeText?: string;
}

export const MAIL_PROVIDER_PRESETS: RrMailProviderPreset[] = [
  {
    id: "gmail",
    name: "Gmail / Google Workspace",
    domainPattern: "gmail.com",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
    color: "#EA4335",
    badgeText: "IMAP / SMTP",
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail / O365",
    domainPattern: "outlook.com",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false, // STARTTLS
    color: "#0078D4",
    badgeText: "IMAP / STARTTLS",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    domainPattern: "icloud.com",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false, // STARTTLS
    color: "#0088FF",
    badgeText: "IMAP / STARTTLS",
  },
  {
    id: "purelymail",
    name: "Purelymail",
    domainPattern: "purelymail.com",
    imapHost: "imap.purelymail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.purelymail.com",
    smtpPort: 465,
    smtpSecure: true,
    color: "#8B00FF",
    badgeText: "IMAP / SMTP",
  },
  {
    id: "fastmail",
    name: "Fastmail",
    domainPattern: "fastmail.com",
    imapHost: "imap.fastmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.fastmail.com",
    smtpPort: 465,
    smtpSecure: true,
    color: "#1E3A8A",
    badgeText: "IMAP / SMTP",
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    domainPattern: "yahoo.com",
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
    smtpSecure: true,
    color: "#6001D2",
    badgeText: "IMAP / SMTP",
  },
  {
    id: "custom",
    name: "Custom IMAP / SMTP",
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "",
    smtpPort: 465,
    smtpSecure: true,
    color: "#10B981",
    badgeText: "Manual Config",
  },
];
