"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { startRegistration } from "@simplewebauthn/browser";
import {
  Key,
  ShieldCheck,
  Smartphone,
  Mail,
  Trash,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// Sub-components
import { RrChangePasswordCard } from "./rrSecuritySettingsTabComponents/rrChangePasswordCard";
import { RrMfaMethodCard } from "./rrSecuritySettingsTabComponents/rrMfaMethodCard";
import { RrDeviceItem } from "./rrSecuritySettingsTabComponents/rrDeviceItem";
import { RrTotpSetupDialog } from "./rrSecuritySettingsTabComponents/rrTotpSetupDialog";
import { RrEmailMfaSetupDialog } from "./rrSecuritySettingsTabComponents/rrEmailMfaSetupDialog";
import { RrPasskeyRegisterDialog } from "./rrSecuritySettingsTabComponents/rrPasskeyRegisterDialog";
import { RrConfirmDisableDialog } from "./rrSecuritySettingsTabComponents/rrConfirmDisableDialog";
import { RrBackupCodesDialog } from "./rrSecuritySettingsTabComponents/rrBackupCodesDialog";
import { hasPermission, PegasusFlags } from "@runa/permissions";

interface RrSecuritySettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrSecuritySettingsTab = ({
  onOpenChange,
}: RrSecuritySettingsTabProps): React.JSX.Element => {
  const { data: session, update } = useSession();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // MFA status states
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false);
  const [emailMfaEnabled, setEmailMfaEnabled] = useState<boolean>(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [hasBackupCodes, setHasBackupCodes] = useState<boolean>(false);

  // Devices States
  const [devices, setDevices] = useState<any[]>([]);

  // Link Device States
  const [linkCodeInput, setLinkCodeInput] = useState<string>("");
  const [isLinking, setIsLinking] = useState<boolean>(false);

  // Session Token Refresh States
  const [refreshCountdown, setRefreshCountdown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

  useEffect(() => {
    const lastRefresh = localStorage.getItem("runa-last-token-refresh");
    if (lastRefresh) {
      const parsedTime = parseInt(lastRefresh, 10);
      setLastRefreshTime(parsedTime);
      const elapsed = Date.now() - parsedTime;
      const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
      if (remaining > 0) {
        setRefreshCountdown(remaining);
      }
    }
  }, []);

  useEffect(() => {
    if (refreshCountdown <= 0) return;
    const timer = setInterval((): void => {
      setRefreshCountdown((prev: number): number => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return (): void => clearInterval(timer);
  }, [refreshCountdown]);

  const handleRefreshToken = async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await update();
      const now = Date.now();
      localStorage.setItem("runa-last-token-refresh", now.toString());
      setLastRefreshTime(now);
      setRefreshCountdown(60);
      toast.success("Session token refreshed successfully!");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh session token.";
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  // TOTP setup states
  const [isTotpSetupOpen, setIsTotpSetupOpen] = useState<boolean>(false);
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [totpQrUrl, setTotpQrUrl] = useState<string>("");
  const [totpCode, setTotpCode] = useState<string>("");

  // Email Setup States
  const [isEmailSetupOpen, setIsEmailSetupOpen] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");

  // Passkey setup states
  const [isPasskeyRegisterOpen, setIsPasskeyRegisterOpen] =
    useState<boolean>(false);
  const [passkeyNickname, setPasskeyNickname] = useState<string>("");

  // Backup Codes Dialog States
  const [showCodesDialog, setShowCodesDialog] = useState<boolean>(false);
  const [displayedBackupCodes, setDisplayedBackupCodes] = useState<string[]>(
    [],
  );
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);

  // General Confirm password for disabling MFA states
  const [isConfirmDisableOpen, setIsConfirmDisableOpen] =
    useState<boolean>(false);
  const [disableMethod, setDisableMethod] = useState<
    "totp" | "email" | "passkey" | null
  >(null);
  const [disablePasskeyId, setDisablePasskeyId] = useState<string | null>(null);

  const { data: mfaStatusData, mutate: refetchMfaSettings } = useSWR<any>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/status`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const { data: passkeysData, mutate: refetchPasskeys } = useSWR<any[]>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/passkeys`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const { data: devicesData, mutate: refetchDevices } = useSWR<any[]>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/users/me/devices`, session.accessToken]
      : null,
    fetcher,
  );

  useEffect(() => {
    if (mfaStatusData) {
      setTotpEnabled(mfaStatusData.totpEnabled);
      setEmailMfaEnabled(mfaStatusData.emailMfaEnabled);
      setHasBackupCodes(mfaStatusData.hasBackupCodes);
    }
  }, [mfaStatusData]);

  useEffect(() => {
    if (passkeysData) {
      setPasskeys(Array.isArray(passkeysData) ? passkeysData : []);
    }
  }, [passkeysData]);

  useEffect(() => {
    if (devicesData) {
      setDevices(Array.isArray(devicesData) ? devicesData : []);
    }
  }, [devicesData]);

  const apiMutate = async (
    url: string,
    method: string = "POST",
    body?: any,
  ) => {
    if (!session?.accessToken) throw new Error("No access token available");
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(
        errJson?.message || `Request failed with status ${res.status}`,
      );
    }
    return res.json().catch(() => null);
  };

  const fetchMfaSettings = (): void => {
    refetchMfaSettings();
    refetchPasskeys();
  };

  const fetchDevices = (): void => {
    refetchDevices();
  };

  const handleRevokeDevice = async (deviceId: string): Promise<void> => {
    if (!session?.accessToken) return;
    if (
      !window.confirm(
        "Are you sure you want to revoke trust for this device? It will lose access to decrypt E2EE files and chat messages.",
      )
    )
      return;
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/devices/${deviceId}`,
        "DELETE",
      );
      toast.success("Device revoked successfully.");
      fetchDevices();
    } catch (err: any) {
      toast.error(err.message || "Revoke failed.");
    }
  };

  const handleLinkDevice = async () => {
    const code = linkCodeInput.replace(/[\s-]/g, "").trim();
    if (code.length !== 10) {
      toast.error("Please enter a valid 10-digit code.");
      return;
    }

    setIsLinking(true);
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login-code/link`,
        "POST",
        { code },
      );
      toast.success("Device linked successfully!");
      setLinkCodeInput("");
    } catch (err: any) {
      toast.error(err.message || "Failed to link device. Code may be invalid or expired.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleChangePassword = async (
    current: string,
    newPass: string,
  ): Promise<void> => {
    setIsSubmitting(true);
    try {
      await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, "PUT", {
        currentPassword: current,
        newPassword: newPass,
      });
      toast.success("Password changed successfully!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // TOTP functions
  const initiateTotpSetup = async (): Promise<void> => {
    try {
      const data = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/totp/setup`,
        "POST",
      );
      setTotpSecret(data.secret);
      setTotpQrUrl(data.otpauthUrl);
      setIsTotpSetupOpen(true);
      setTotpCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate TOTP.");
    }
  };

  const confirmEnableTotp = async (): Promise<void> => {
    if (!totpCode || totpCode.length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/totp/enable`,
        "POST",
        { code: totpCode },
      );

      toast.success("Authenticator app enabled successfully!");
      setIsTotpSetupOpen(false);

      if (Array.isArray(data) && data.length > 0) {
        setDisplayedBackupCodes(data);
        setShowCodesDialog(true);
      }
      fetchMfaSettings();
    } catch (err: any) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email OTP setup functions
  const initiateEmailMfaSetup = async (): Promise<void> => {
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/email/send-setup-code`,
        "POST",
      );
      setIsEmailSetupOpen(true);
      setEmailOtpCode("");
      toast.info("Verification code sent to your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate email MFA.");
    }
  };

  const confirmEnableEmailMfa = async (): Promise<void> => {
    if (!emailOtpCode || emailOtpCode.length !== 6) {
      toast.error("Please enter a 6-digit code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/email/enable`,
        "POST",
        { code: emailOtpCode },
      );

      toast.success("Email verification enabled successfully!");
      setIsEmailSetupOpen(false);

      if (Array.isArray(data) && data.length > 0) {
        setDisplayedBackupCodes(data);
        setShowCodesDialog(true);
      }
      fetchMfaSettings();
    } catch (err: any) {
      toast.error(err.message || "Verification failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Passkey functions
  const registerPasskey = async (): Promise<void> => {
    if (!passkeyNickname.trim()) {
      toast.error("Please enter a nickname for your passkey.");
      return;
    }
    setIsSubmitting(true);
    try {
      const options = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/passkey/register-options`,
        "POST",
      );

      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      const verifyData = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/passkey/register-verify`,
        "POST",
        {
          response: attestationResponse,
          name: passkeyNickname,
        },
      );

      toast.success("Passkey registered successfully!");
      setIsPasskeyRegisterOpen(false);
      setPasskeyNickname("");

      if (Array.isArray(verifyData) && verifyData.length > 0) {
        setDisplayedBackupCodes(verifyData);
        setShowCodesDialog(true);
      }
      fetchMfaSettings();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Passkey registration failed or cancelled.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDeletePasskey = (passkeyId: string): void => {
    setDisableMethod("passkey");
    setDisablePasskeyId(passkeyId);
    setIsConfirmDisableOpen(true);
  };

  // Disabling functions
  const executeDisableMfa = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      let endpoint = "";
      let method = "POST";

      if (disableMethod === "totp") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/totp/disable`;
      } else if (disableMethod === "email") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/email/disable`;
      } else if (disableMethod === "passkey" && disablePasskeyId) {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/passkeys/${disablePasskeyId}`;
        method = "DELETE";
      }

      await apiMutate(endpoint, method);

      toast.success(
        `${disableMethod === "passkey" ? "Passkey" : disableMethod?.toUpperCase()} disabled/removed successfully.`,
      );
      setIsConfirmDisableOpen(false);
      setDisableMethod(null);
      setDisablePasskeyId(null);
      fetchMfaSettings();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Backup Codes
  const regenerateBackupCodes = async (): Promise<void> => {
    if (
      !window.confirm(
        "Regenerating backup codes will invalidate your current ones. Continue?",
      )
    )
      return;
    setIsSubmitting(true);
    try {
      const data = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/mfa/backup-codes/regenerate`,
        "POST",
      );
      setDisplayedBackupCodes(data);
      setShowCodesDialog(true);
      toast.success("Backup codes regenerated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate backup codes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyBackupCodesToClipboard = (): void => {
    const codeText = displayedBackupCodes.join("\n");
    navigator.clipboard.writeText(codeText);
    setCopiedCodes(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const downloadBackupCodesFile = (): void => {
    const text = `Runa Account Backup Codes\nGenerated at: ${new Date().toLocaleString()}\n\nKeep these codes safe and secure. Each code can only be used once.\n\n${displayedBackupCodes.join("\n")}\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `runa-backup-codes-${session?.user?.username}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  console.log(hasPermission(session?.user?.permissions, [PegasusFlags.VIEW]));

  return (
    <div className="flex flex-col gap-6 p-2">
      {/* Passwords change card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RrChangePasswordCard
          isSubmitting={isSubmitting}
          onChangePassword={handleChangePassword}
        />

        {/* MFA Panel Intro */}
        <Card className="flex flex-col justify-between relative overflow-hidden text-left">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="size-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                Protection Active
              </span>
            </div>
            <CardTitle className="text-lg font-bold">
              Multi-Factor Authentication (MFA)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Add an extra layer of security to your Runa account. By activating
              MFA, logins will require not only your password but also
              verification via passkeys, email codes, or authenticator app
              tokens.
            </CardDescription>
          </CardHeader>
          {hasBackupCodes && (
            <CardContent className="pt-0">
              <div className="relative z-10 p-3 rounded-xl border border-success/10 bg-success/5 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-success uppercase tracking-wide">
                    Recovery System Active
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Generate backup codes in case you lose access to your
                    primary authentication devices.
                  </p>
                </div>
                <Button
                  onClick={regenerateBackupCodes}
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg cursor-pointer"
                >
                  Regenerate
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* List of MFA options */}
      <div className="flex flex-col gap-4 pt-2 text-left">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Verification Methods
        </h4>

        <div className="flex flex-col gap-4 p-1">
          {/* Auth app and Email code next to each other */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Authenticator App (TOTP) */}
            <RrMfaMethodCard
              title="Authenticator App"
              description="Use application tools like Google Authenticator or 1Password to generate 6-digit verification codes."
              icon={<Smartphone className="size-4.5" />}
              isActive={totpEnabled}
              statusText={totpEnabled ? "Active" : "Inactive"}
              actionText={totpEnabled ? "Disconnect" : "Setup TOTP"}
              onAction={
                totpEnabled
                  ? () => {
                      setDisableMethod("totp");
                      setIsConfirmDisableOpen(true);
                    }
                  : initiateTotpSetup
              }
            />

            {/* Email Verification OTP */}
            <RrMfaMethodCard
              title="Email One-Time Code"
              description="Receive temporary verification codes sent to your primary registered email address on login attempt."
              icon={<Mail className="size-4.5" />}
              isActive={emailMfaEnabled}
              statusText={emailMfaEnabled ? "Active" : "Inactive"}
              actionText={emailMfaEnabled ? "Disconnect" : "Setup Email OTP"}
              onAction={
                emailMfaEnabled
                  ? () => {
                      setDisableMethod("email");
                      setIsConfirmDisableOpen(true);
                    }
                  : initiateEmailMfaSetup
              }
            />
          </div>

          {/* Passkeys and Registered passkeys list next to each other */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WebAuthn Passkeys */}
            <RrMfaMethodCard
              title="Passkeys / Biometrics"
              description="Log in passwordlessly or complete 2FA securely using Face ID, Touch ID, Windows Hello, or hardware keys."
              icon={<Key className="size-4.5" />}
              isActive={passkeys.length > 0}
              statusText={
                passkeys.length > 0
                  ? `${passkeys.length} Registered`
                  : "Inactive"
              }
              actionText="Add Passkey"
              onAction={() => setIsPasskeyRegisterOpen(true)}
              actionVariant="default"
              actionClassName="bg-primary hover:bg-primary/95 text-primary-foreground"
            />

            {/* Registered Passkeys List */}
            <Card className="flex flex-col justify-between text-left">
              <CardHeader className="flex flex-col gap-2 pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Key className="size-4.5" />
                  </div>
                  <UiBadge variant="outline">
                    {passkeys.length > 0 ? `${passkeys.length} Saved` : "None"}
                  </UiBadge>
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Registered Passkeys
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                {passkeys.length > 0 ? (
                  <div className="divide-y divide-border flex flex-col gap-2.5 overflow-y-auto max-h-[120px] no-scrollbar">
                    {passkeys.map((pk) => (
                      <div
                        key={pk.id}
                        className="flex items-center justify-between pt-2.5 first:pt-0"
                      >
                        <div className="flex flex-col gap-0.5 text-left min-w-0 flex-1">
                          <span className="text-xs font-bold text-foreground block truncate">
                            {pk.name || "Unnamed Passkey"}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Added: {new Date(pk.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          onClick={() => triggerDeletePasskey(pk.id)}
                          variant="ghost"
                          className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 ml-2"
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-4 text-center text-muted-foreground/40">
                    <Key className="size-5 mb-1.5 opacity-30" />
                    <span className="text-[10px]">
                      No passkeys registered yet.
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 h-9" />
            </Card>
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div className="flex flex-col gap-4 pt-4 border-t border-border text-left">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Active Session
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Session Token Refresh Card */}
          <Card className="flex flex-col justify-between relative overflow-hidden text-left">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <RefreshCw
                  className={cn("size-5", isRefreshing && "animate-spin")}
                />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  Session Token
                </span>
              </div>
              <CardTitle className="text-lg font-bold">
                Session Settings
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
                If your permissions got updated recently or you don't have
                access to stuff you should have, try refreshing your active
                session manually to apply changes immediately without logging
                out.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[10px] text-muted-foreground/85 bg-muted/20 border border-border/40 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span>Last Refresh:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {lastRefreshTime
                      ? new Date(lastRefreshTime).toLocaleTimeString()
                      : "Never this session"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Token Expiration:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {session?.expires
                      ? new Date(session.expires).toLocaleTimeString()
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshing || refreshCountdown > 0}
                className="w-full h-9 rounded-xl font-semibold cursor-pointer relative"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : refreshCountdown > 0 ? (
                  `Refresh Token (${refreshCountdown}s)`
                ) : (
                  <>
                    <RefreshCw className="size-4 mr-2" />
                    Refresh Session
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Device Management Section */}
      <div className="flex flex-col gap-4 pt-4 border-t border-border text-left">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Connected Devices
        </h4>

        {/* Link Device via Code Card */}
        <Card className="border border-border rounded-2xl bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
                <Key className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Link a New Device
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Enter the 10-digit code shown on the device you want to authorize
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                id="link-device-code"
                placeholder="e.g. 1234567890"
                value={linkCodeInput}
                onChange={(e) => setLinkCodeInput(e.target.value.replace(/[^0-9\s-]/g, "").slice(0, 12))}
                disabled={isLinking}
                className="h-9 text-sm font-mono tracking-widest rounded-xl bg-background border-input"
                maxLength={12}
              />
              <Button
                onClick={handleLinkDevice}
                disabled={isLinking || linkCodeInput.replace(/[\s-]/g, "").length !== 10}
                className="h-9 px-4 text-xs font-semibold rounded-xl shrink-0"
              >
                {isLinking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Authorize"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <RrDeviceItem
              key={device.id}
              device={device}
              onRevoke={handleRevokeDevice}
            />
          ))}
          {devices.length === 0 && (
            <div className="col-span-full p-6 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
              No registered devices found.
            </div>
          )}
        </div>
      </div>

      {/* Actions footer for general tab closing */}
      <div className="flex justify-end pt-4 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer"
        >
          Close Settings
        </Button>
      </div>

      {/* Dialogs */}
      <RrTotpSetupDialog
        open={isTotpSetupOpen}
        onOpenChange={setIsTotpSetupOpen}
        totpSecret={totpSecret}
        totpQrUrl={totpQrUrl}
        totpCode={totpCode}
        setTotpCode={setTotpCode}
        isSubmitting={isSubmitting}
        onVerify={confirmEnableTotp}
      />

      <RrEmailMfaSetupDialog
        open={isEmailSetupOpen}
        onOpenChange={setIsEmailSetupOpen}
        emailOtpCode={emailOtpCode}
        setEmailOtpCode={setEmailOtpCode}
        isSubmitting={isSubmitting}
        onVerify={confirmEnableEmailMfa}
      />

      <RrPasskeyRegisterDialog
        open={isPasskeyRegisterOpen}
        onOpenChange={setIsPasskeyRegisterOpen}
        nickname={passkeyNickname}
        setNickname={setPasskeyNickname}
        isSubmitting={isSubmitting}
        onRegister={registerPasskey}
      />

      <RrConfirmDisableDialog
        open={isConfirmDisableOpen}
        onOpenChange={setIsConfirmDisableOpen}
        isSubmitting={isSubmitting}
        onConfirm={executeDisableMfa}
        method={disableMethod}
      />

      <RrBackupCodesDialog
        open={showCodesDialog}
        onOpenChange={setShowCodesDialog}
        backupCodes={displayedBackupCodes}
        onCopy={copyBackupCodesToClipboard}
        onDownload={downloadBackupCodesFile}
        copied={copiedCodes}
      />
    </div>
  );
};
