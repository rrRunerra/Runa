"use client";

import type React from "react";
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Mail,
  Trash,
} from "lucide-react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { RrMfaMethodCard } from "./rrMfaMethodCard";
import { RrTotpSetupDialog } from "./rrTotpSetupDialog";
import { RrEmailMfaSetupDialog } from "./rrEmailMfaSetupDialog";
import { RrPasskeyRegisterDialog } from "./rrPasskeyRegisterDialog";
import { RrBackupCodesDialog } from "./rrBackupCodesDialog";
import { RrConfirmDialog } from "@/components/rrComponents/rrConfirmDialog";

export interface RrSecurityMfaSubTabProps {
  mfaStatusData: any;
  passkeysData: any[];
  isSubmitting: boolean;
  isTotpSetupOpen: boolean;
  setIsTotpSetupOpen: (open: boolean) => void;
  totpSecret: string;
  totpQrUrl: string;
  totpCode: string;
  setTotpCode: (code: string) => void;
  onInitiateTotpSetup: () => Promise<void>;
  onConfirmEnableTotp: () => Promise<void>;
  isEmailSetupOpen: boolean;
  setIsEmailSetupOpen: (open: boolean) => void;
  emailOtpCode: string;
  setEmailOtpCode: (code: string) => void;
  onInitiateEmailMfa: () => Promise<void>;
  onConfirmEnableEmailMfa: () => Promise<void>;
  isPasskeyRegisterOpen: boolean;
  setIsPasskeyRegisterOpen: (open: boolean) => void;
  passkeyNickname: string;
  setPasskeyNickname: (name: string) => void;
  onRegisterPasskey: () => Promise<void>;
  showCodesDialog: boolean;
  setShowCodesDialog: (show: boolean) => void;
  displayedBackupCodes: string[];
  copiedCodes: boolean;
  onCopyBackupCodes: () => void;
  onInitiateRegenerateBackupCodes: () => void;
  onConfirmRegenerateBackupCodes: () => Promise<void>;
  onInitiateDisableMfa: (
    method: "totp" | "email" | "passkey" | "all",
    passkeyId?: string
  ) => void;
  onConfirmDisableMfa: () => Promise<void>;
  isConfirmDisableOpen: boolean;
  setIsConfirmDisableOpen: (open: boolean) => void;
  isConfirmRegenerateOpen: boolean;
  setIsConfirmRegenerateOpen: (open: boolean) => void;
  disableMethod: "totp" | "email" | "passkey" | "all" | null;
}

/**
 * Presentational subtab component displaying Multi-Factor Authentication (MFA), Passkeys, and Backup Codes.
 */
export function RrSecurityMfaSubTab({
  mfaStatusData,
  passkeysData,
  isSubmitting,
  isTotpSetupOpen,
  setIsTotpSetupOpen,
  totpSecret,
  totpQrUrl,
  totpCode,
  setTotpCode,
  onInitiateTotpSetup,
  onConfirmEnableTotp,
  isEmailSetupOpen,
  setIsEmailSetupOpen,
  emailOtpCode,
  setEmailOtpCode,
  onInitiateEmailMfa,
  onConfirmEnableEmailMfa,
  isPasskeyRegisterOpen,
  setIsPasskeyRegisterOpen,
  passkeyNickname,
  setPasskeyNickname,
  onRegisterPasskey,
  showCodesDialog,
  setShowCodesDialog,
  displayedBackupCodes,
  copiedCodes,
  onCopyBackupCodes,
  onInitiateRegenerateBackupCodes,
  onConfirmRegenerateBackupCodes,
  onInitiateDisableMfa,
  onConfirmDisableMfa,
  isConfirmDisableOpen,
  setIsConfirmDisableOpen,
  isConfirmRegenerateOpen,
  setIsConfirmRegenerateOpen,
  disableMethod,
}: RrSecurityMfaSubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  const totpEnabled = !!mfaStatusData?.totpEnabled;
  const emailMfaEnabled = !!mfaStatusData?.emailMfaEnabled;
  const hasBackupCodes = !!mfaStatusData?.hasBackupCodes;
  const passkeys = Array.isArray(passkeysData) ? passkeysData : [];
  const isMfaActive = totpEnabled || emailMfaEnabled || passkeys.length > 0;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Overall MFA Overview Banner */}
      <Card
        className={cn(
          "p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border transition-colors",
          isMfaActive
            ? "bg-success/5 border-success/30"
            : "bg-warning/5 border-warning/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
              isMfaActive
                ? "bg-success/15 border-success/30 text-success"
                : "bg-warning/15 border-warning/30 text-warning"
            )}
          >
            {isMfaActive ? (
              <ShieldCheck className="size-5" />
            ) : (
              <ShieldAlert className="size-5" />
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {t("securitySettings.twoFactorAuthTitle", "Two-Factor Authentication")}
              </span>
              <UiBadge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  isMfaActive
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-warning/15 text-warning border-warning/30"
                )}
              >
                {isMfaActive
                  ? t("securitySettings.statusProtected", "Protected")
                  : t("securitySettings.statusNotProtected", "Not Protected")}
              </UiBadge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isMfaActive
                ? t(
                    "securitySettings.mfaEnabledSummary",
                    "Two-Factor Authentication is currently active for your account."
                  )
                : t(
                    "securitySettings.mfaDisabledSummary",
                    "Enhance your account security by enabling Two-Factor Authentication."
                  )}
            </p>
          </div>
        </div>

        {isMfaActive && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onInitiateRegenerateBackupCodes}
              disabled={isSubmitting}
              className="text-xs h-8 px-3 rounded-xl font-semibold cursor-pointer shrink-0"
            >
              {hasBackupCodes
                ? t("securitySettings.regenerateCodesBtn", "Regenerate Backup Codes")
                : t("securitySettings.generateCodesBtn", "Generate Backup Codes")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInitiateDisableMfa("all")}
              disabled={isSubmitting}
              className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer h-8 rounded-xl"
            >
              {t("securitySettings.disableAllMfaBtn", "Disable All 2FA")}
            </Button>
          </div>
        )}
      </Card>

      {/* MFA Methods Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOTP Method Card */}
        <RrMfaMethodCard
          icon={Smartphone}
          title={t("securitySettings.authenticatorAppTitle", "Authenticator App")}
          description={t(
            "securitySettings.authenticatorAppDesc",
            "Use an authenticator app (Google Authenticator, Bitwarden, Authy) to generate one-time security codes."
          )}
          isEnabled={totpEnabled}
          badgeText={
            totpEnabled
              ? t("securitySettings.activeBadge", "Active")
              : t("securitySettings.recommendedBadge", "Recommended")
          }
          badgeVariant={totpEnabled ? "success" : "default"}
          onEnable={onInitiateTotpSetup}
          onDisable={() => onInitiateDisableMfa("totp")}
          isSubmitting={isSubmitting}
        />

        {/* Email OTP Method Card */}
        <RrMfaMethodCard
          icon={Mail}
          title={t("securitySettings.emailAuthTitle", "Email Verification")}
          description={t(
            "securitySettings.emailAuthDesc",
            "Receive one-time passcodes sent to your registered email address when signing in."
          )}
          isEnabled={emailMfaEnabled}
          badgeText={
            emailMfaEnabled
              ? t("securitySettings.activeBadge", "Active")
              : t("securitySettings.availableBadge", "Available")
          }
          badgeVariant={emailMfaEnabled ? "success" : "secondary"}
          onEnable={onInitiateEmailMfa}
          onDisable={() => onInitiateDisableMfa("email")}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Passkeys WebAuthn Section */}
      <Card className="p-5 flex flex-col gap-4 text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Key className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-foreground">
                {t("securitySettings.passkeysTitle", "Passkeys (WebAuthn)")}
              </span>
              <p className="text-xs text-muted-foreground">
                {t(
                  "securitySettings.passkeysDesc",
                  "Use biometrics, TouchID, FaceID, or hardware security keys to sign in instantly."
                )}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPasskeyNickname("");
              setIsPasskeyRegisterOpen(true);
            }}
            disabled={isSubmitting}
            className="text-xs h-8 px-3 rounded-xl font-semibold cursor-pointer shrink-0"
          >
            {t("securitySettings.addPasskeyBtn", "Add Passkey")}
          </Button>
        </div>

        {/* Registered Passkeys List */}
        <div className="flex flex-col gap-2">
          {passkeys.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              {t("securitySettings.noPasskeysRegistered", "No passkeys registered yet.")}
            </div>
          ) : (
            passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Key className="size-3.5 text-primary shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-foreground truncate">
                      {pk.name ||
                        t("securitySettings.unnamedPasskey", "Passkey")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {t("securitySettings.registeredLabel", "Registered on")}{" "}
                      {new Date(pk.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onInitiateDisableMfa("passkey", pk.id)}
                  disabled={isSubmitting}
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer shrink-0"
                >
                  <Trash className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* TOTP Setup Modal */}
      <RrTotpSetupDialog
        open={isTotpSetupOpen}
        onOpenChange={setIsTotpSetupOpen}
        totpSecret={totpSecret}
        totpQrUrl={totpQrUrl}
        totpCode={totpCode}
        setTotpCode={setTotpCode}
        isSubmitting={isSubmitting}
        onVerify={onConfirmEnableTotp}
      />

      {/* Email OTP Setup Modal */}
      <RrEmailMfaSetupDialog
        open={isEmailSetupOpen}
        onOpenChange={setIsEmailSetupOpen}
        emailOtpCode={emailOtpCode}
        setEmailOtpCode={setEmailOtpCode}
        isSubmitting={isSubmitting}
        onVerify={onConfirmEnableEmailMfa}
        onResendOtp={onInitiateEmailMfa}
      />

      {/* Passkey Registration Modal */}
      <RrPasskeyRegisterDialog
        open={isPasskeyRegisterOpen}
        onOpenChange={setIsPasskeyRegisterOpen}
        nickname={passkeyNickname}
        setNickname={setPasskeyNickname}
        isSubmitting={isSubmitting}
        onRegister={onRegisterPasskey}
      />

      {/* Backup Codes Display Dialog */}
      <RrBackupCodesDialog
        open={showCodesDialog}
        onOpenChange={setShowCodesDialog}
        backupCodes={displayedBackupCodes}
        copied={copiedCodes}
        onCopy={onCopyBackupCodes}
      />

      {/* Disable MFA Confirmation Dialog */}
      <RrConfirmDialog
        open={isConfirmDisableOpen}
        onOpenChange={setIsConfirmDisableOpen}
        title={t("securitySettings.disableMfaConfirmTitle", "Disable Authentication Method")}
        description={
          disableMethod === "all"
            ? t(
                "securitySettings.disableAllMfaConfirmDesc",
                "Are you sure you want to disable all Two-Factor Authentication methods for your account?"
              )
            : t(
                "securitySettings.disableMethodConfirmDesc",
                "Are you sure you want to disable this authentication method?"
              )
        }
        confirmText={t("securitySettings.disableBtn", "Disable")}
        variant="destructive"
        isSubmitting={isSubmitting}
        onConfirm={onConfirmDisableMfa}
      />

      {/* Regenerate Backup Codes Confirmation Dialog */}
      <RrConfirmDialog
        open={isConfirmRegenerateOpen}
        onOpenChange={setIsConfirmRegenerateOpen}
        title={t(
          "securitySettings.regenerateCodesConfirmTitle",
          "Regenerate Backup Codes"
        )}
        description={t(
          "securitySettings.regenerateCodesConfirmDesc",
          "Generating new backup codes will immediately invalidate all existing recovery codes. Are you sure?"
        )}
        confirmText={t("securitySettings.regenerateBtn", "Regenerate")}
        variant="warning"
        isSubmitting={isSubmitting}
        onConfirm={onConfirmRegenerateBackupCodes}
      />
    </div>
  );
}
