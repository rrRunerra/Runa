import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: port === '465',
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`SMTP Mailer initialized using ${host}:${port}`);
    } else {
      this.logger.warn('SMTP settings missing. Email verification will run in console-log fallback mode.');
    }
  }

  async sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
    const from = process.env.SMTP_FROM || 'no-reply@runerra.org';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        return false;
      }
    } else {
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      if (isDev) {
        this.logger.log(`
=========================================
[DEV MAIL OUTBOX]
To: ${to}
Subject: ${subject}
Message: ${text}
=========================================
        `);
        return true;
      } else {
        this.logger.error(`Failed to send email to ${to}: SMTP is not configured in production.`);
        return false;
      }
    }
  }
}
export { nodemailer };
