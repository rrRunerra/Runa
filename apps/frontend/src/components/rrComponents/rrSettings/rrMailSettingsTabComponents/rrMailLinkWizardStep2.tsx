"use client";

import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RrMailProviderPreset } from "./rrMailProviderPresets";
import {
  Server,
  KeyRound,
  Eye,
  EyeOff,
  Wand2,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export interface ConnectionTestState {
  tested: boolean;
  loading: boolean;
  imapSuccess?: boolean;
  imapError?: string;
  smtpSuccess?: boolean;
  smtpError?: string;
}

interface RrMailLinkWizardStep2Props {
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
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-5 py-2 text-left">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Server className="size-4 text-primary" />
            {t("mailSettings.wizard.step2Title")}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t("mailSettings.wizard.step2Subtitle")}
          </p>
        </div>

        <Button
          type="button"
          onClick={onAutodetect}
          disabled={isAutodetecting}
          variant="outline"
          className="h-8 rounded-lg border-border hover:bg-muted text-xs px-3 gap-1.5 shrink-0 cursor-pointer"
        >
          {isAutodetecting ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <Wand2 className="size-3.5 text-primary" />
          )}
          {t("mailSettings.autodetectBtn")}
        </Button>
      </div>

      {/* Account Credentials */}
      <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email-input" className="text-xs font-medium">
              {t("mailSettings.loginEmailLabel")}
            </Label>
            <Input
              id="login-email-input"
              value={loginEmail}
              onChange={(e) => onChangeLoginEmail(e.target.value)}
              className="h-9 px-3 text-xs bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              {t("mailSettings.loginEmailDesc")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password-input" className="text-xs font-medium flex items-center gap-1">
              <KeyRound className="size-3 text-muted-foreground" />
              {t("mailSettings.passwordLabel")}
            </Label>
            <div className="relative">
              <Input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => onChangePassword(e.target.value)}
                className="h-9 pl-3 pr-9 text-xs bg-background font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t("mailSettings.wizard.passwordSecurityDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* IMAP & SMTP Server Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Incoming IMAP */}
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/80 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wide">
              {t("mailSettings.incomingImapTitle")}
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
              IMAP
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="imap-host-input" className="text-xs font-medium">
              {t("mailSettings.serverHostnameLabel")}
            </Label>
            <Input
              id="imap-host-input"
              value={imapHost}
              onChange={(e) => onChangeImapHost(e.target.value)}
              className="h-8.5 px-3 text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imap-port-input" className="text-xs font-medium">
                {t("mailSettings.portLabel")}
              </Label>
              <Input
                id="imap-port-input"
                value={imapPort}
                onChange={(e) => onChangeImapPort(e.target.value)}
                className="h-8.5 px-3 text-xs bg-background"
              />
            </div>

            <div className="flex items-center justify-between h-8.5 px-3 rounded-lg border border-border bg-background">
              <Label htmlFor="imap-ssl-switch" className="text-xs cursor-pointer">
                {t("mailSettings.sslTlsLabel")}
              </Label>
              <Switch
                id="imap-ssl-switch"
                checked={imapSecure}
                onCheckedChange={onChangeImapSecure}
              />
            </div>
          </div>
        </div>

        {/* Outgoing SMTP */}
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/80 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wide">
              {t("mailSettings.outgoingSmtpTitle")}
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
              SMTP
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="smtp-host-input" className="text-xs font-medium">
              {t("mailSettings.serverHostnameLabel")}
            </Label>
            <Input
              id="smtp-host-input"
              value={smtpHost}
              onChange={(e) => onChangeSmtpHost(e.target.value)}
              className="h-8.5 px-3 text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="smtp-port-input" className="text-xs font-medium">
                {t("mailSettings.portLabel")}
              </Label>
              <Input
                id="smtp-port-input"
                value={smtpPort}
                onChange={(e) => onChangeSmtpPort(e.target.value)}
                className="h-8.5 px-3 text-xs bg-background"
              />
            </div>

            <div className="flex items-center justify-between h-8.5 px-3 rounded-lg border border-border bg-background">
              <Label htmlFor="smtp-ssl-switch" className="text-xs cursor-pointer">
                {t("mailSettings.sslTlsLabel")}
              </Label>
              <Switch
                id="smtp-ssl-switch"
                checked={smtpSecure}
                onCheckedChange={onChangeSmtpSecure}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connection Tester */}
      <div className="p-4 rounded-xl border border-border/70 bg-card/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              {t("mailSettings.wizard.testConnectionTitle")}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {t("mailSettings.wizard.testConnectionDesc")}
            </span>
          </div>

          <Button
            type="button"
            onClick={onTestConnection}
            disabled={testState.loading}
            variant="outline"
            className="h-8.5 rounded-lg border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 gap-1.5 font-semibold cursor-pointer"
          >
            {testState.loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {t("mailSettings.wizard.testConnectionBtn")}
          </Button>
        </div>

        {/* Live Test Results Badges */}
        {testState.tested && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-border/40">
            {/* IMAP Status */}
            <div
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg text-xs border",
                testState.imapSuccess
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {testState.imapSuccess ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <XCircle className="size-4 shrink-0" />
              )}
              <span className="truncate">
                {testState.imapSuccess
                  ? t("mailSettings.wizard.imapConnectedSuccess")
                  : t("mailSettings.wizard.imapError", { error: testState.imapError || "Failed" })}
              </span>
            </div>

            {/* SMTP Status */}
            <div
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg text-xs border",
                testState.smtpSuccess
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
              )}
            >
              {testState.smtpSuccess ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <XCircle className="size-4 shrink-0" />
              )}
              <span className="truncate">
                {testState.smtpSuccess
                  ? t("mailSettings.wizard.smtpConnectedSuccess")
                  : t("mailSettings.wizard.smtpError", { error: testState.smtpError || "Failed" })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
