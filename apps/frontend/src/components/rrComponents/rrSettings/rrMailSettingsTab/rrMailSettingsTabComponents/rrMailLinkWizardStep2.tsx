import type React from "react";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { type RrMailProviderPreset } from "./rrMailProviderPresets";

export interface ConnectionTestState {
  tested: boolean;
  loading: boolean;
  imapSuccess?: boolean;
  imapError?: string;
  smtpSuccess?: boolean;
  smtpError?: string;
}

export interface RrMailLinkWizardStep2Props {
  selectedProvider: RrMailProviderPreset;
  emailAddress: string;
  loginEmail: string;
  onChangeLoginEmail: (val: string) => void;
  password: string;
  onChangePassword: (val: string) => void;
  imapHost: string;
  onChangeImapHost: (val: string) => void;
  imapPort: string;
  onChangeImapPort: (val: string) => void;
  imapSecure: boolean;
  onChangeImapSecure: (val: boolean) => void;
  smtpHost: string;
  onChangeSmtpHost: (val: string) => void;
  smtpPort: string;
  onChangeSmtpPort: (val: string) => void;
  smtpSecure: boolean;
  onChangeSmtpSecure: (val: boolean) => void;
  onAutodetect: () => void;
  isAutodetecting: boolean;
  testState: ConnectionTestState;
  onTestConnection: () => Promise<boolean>;
}

export function RrMailLinkWizardStep2({
  selectedProvider,
  emailAddress,
  loginEmail,
  onChangeLoginEmail,
  password,
  onChangePassword,
  imapHost,
  onChangeImapHost,
  imapPort,
  onChangeImapPort,
  imapSecure,
  onChangeImapSecure,
  smtpHost,
  onChangeSmtpHost,
  smtpPort,
  onChangeSmtpPort,
  smtpSecure,
  onChangeSmtpSecure,
  onAutodetect,
  isAutodetecting,
  testState,
  onTestConnection,
}: RrMailLinkWizardStep2Props): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t("mailSettings.wizard.serverConfigHeading")} ({selectedProvider.name})
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAutodetect}
          disabled={isAutodetecting}
          className="h-7 text-xs font-semibold rounded-lg gap-1"
        >
          {isAutodetecting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          {t("mailSettings.wizard.autodetectBtn")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-username-input">{t("mailSettings.wizard.loginUsernameLabel")}</Label>
          <Input
            id="login-username-input"
            value={loginEmail}
            onChange={(e) => onChangeLoginEmail(e.target.value)}
            placeholder={emailAddress || "you@domain.com"}
            className="h-9 px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-input">{t("mailSettings.wizard.passwordLabel")}</Label>
          <Input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 px-3"
          />
        </div>
      </div>

      {/* IMAP & SMTP Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* IMAP Box */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-3">
          <span className="text-xs font-bold text-foreground">
            {t("mailSettings.wizard.incomingImap", "IMAP Settings (Incoming)")}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("mailSettings.wizard.host", "Host")}
              </Label>
              <Input
                value={imapHost}
                onChange={(e) => onChangeImapHost(e.target.value)}
                placeholder="imap.domain.com"
                className="h-8 text-xs px-2.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("mailSettings.wizard.port", "Port")}
              </Label>
              <Input
                value={imapPort}
                onChange={(e) => onChangeImapPort(e.target.value)}
                placeholder="993"
                className="h-8 text-xs px-2.5"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {t("mailSettings.wizard.sslTls", "SSL / TLS")}
            </span>
            <Switch checked={imapSecure} onCheckedChange={onChangeImapSecure} />
          </div>
        </div>

        {/* SMTP Box */}
        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-3">
          <span className="text-xs font-bold text-foreground">
            {t("mailSettings.wizard.outgoingSmtp", "SMTP Settings (Outgoing)")}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("mailSettings.wizard.host", "Host")}
              </Label>
              <Input
                value={smtpHost}
                onChange={(e) => onChangeSmtpHost(e.target.value)}
                placeholder="smtp.domain.com"
                className="h-8 text-xs px-2.5"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("mailSettings.wizard.port", "Port")}
              </Label>
              <Input
                value={smtpPort}
                onChange={(e) => onChangeSmtpPort(e.target.value)}
                placeholder="465"
                className="h-8 text-xs px-2.5"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {t("mailSettings.wizard.sslTls", "SSL / TLS")}
            </span>
            <Switch checked={smtpSecure} onCheckedChange={onChangeSmtpSecure} />
          </div>
        </div>
      </div>

      {/* Test Connection Button & Status Display */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTestConnection}
          disabled={testState.loading || !password || !imapHost || !smtpHost}
          className="h-8 px-3.5 text-xs font-semibold rounded-lg shrink-0 gap-1.5"
        >
          {testState.loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {t("mailSettings.wizard.testConnectionBtn")}
        </Button>

        {testState.tested && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              {testState.imapSuccess ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span className={testState.imapSuccess ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                IMAP
              </span>
            </div>
            <div className="flex items-center gap-1">
              {testState.smtpSuccess ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4 text-destructive" />
              )}
              <span className={testState.smtpSuccess ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                SMTP
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
