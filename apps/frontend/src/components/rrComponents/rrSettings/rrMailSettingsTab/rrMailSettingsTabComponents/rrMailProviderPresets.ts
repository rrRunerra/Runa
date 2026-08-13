export interface RrMailProviderPreset {
  id: string;
  name: string;
  domain: string;
  color: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
}

export const MAIL_PROVIDER_PRESETS: RrMailProviderPreset[] = [
  {
    id: "purelymail",
    name: "Purelymail",
    domain: "purelymail.com",
    color: "#8B00FF",
    imapHost: "imap.purelymail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.purelymail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  {
    id: "gmail",
    name: "Google Gmail",
    domain: "gmail.com",
    color: "#EA4335",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail",
    domain: "outlook.com",
    color: "#0078D4",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  {
    id: "icloud",
    name: "Apple iCloud",
    domain: "icloud.com",
    color: "#333333",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  {
    id: "proton",
    name: "ProtonMail (Bridge)",
    domain: "proton.me",
    color: "#6D4AFF",
    imapHost: "127.0.0.1",
    imapPort: 1143,
    imapSecure: false,
    smtpHost: "127.0.0.1",
    smtpPort: 1025,
    smtpSecure: false,
  },
  {
    id: "custom",
    name: "Custom IMAP / SMTP",
    domain: "",
    color: "#00E5FF",
    imapHost: "",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "",
    smtpPort: 465,
    smtpSecure: true,
  },
];
