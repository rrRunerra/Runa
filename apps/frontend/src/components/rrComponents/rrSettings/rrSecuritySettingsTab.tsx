"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { startRegistration } from "@simplewebauthn/browser";
import {
  Key,
  ShieldCheck,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  Copy,
  Download,
  Trash,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface RrSecuritySettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrSecuritySettingsTab = ({ onOpenChange }: RrSecuritySettingsTabProps): React.JSX.Element => {
  const { data: session } = useSession();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Password States
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    maxLength: false,
    uppercase: false,
    number: false,
    special: false,
  });

  // MFA status states
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false);
  const [emailMfaEnabled, setEmailMfaEnabled] = useState<boolean>(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [hasBackupCodes, setHasBackupCodes] = useState<boolean>(false);

  // Devices States
  const [devices, setDevices] = useState<any[]>([]);

  // TOTP setup states
  const [isTotpSetupOpen, setIsTotpSetupOpen] = useState<boolean>(false);
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [totpQrUrl, setTotpQrUrl] = useState<string>("");
  const [totpCode, setTotpCode] = useState<string>("");
  const qrCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node && totpQrUrl) {
      QRCode.toCanvas(node, totpQrUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }).catch((err) => console.error("Error drawing QR canvas:", err));
    }
  }, [totpQrUrl]);

  // Email Setup States
  const [isEmailSetupOpen, setIsEmailSetupOpen] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");

  // Passkey setup states
  const [isPasskeyRegisterOpen, setIsPasskeyRegisterOpen] = useState<boolean>(false);
  const [passkeyNickname, setPasskeyNickname] = useState<string>("");

  // Backup Codes Dialog States
  const [showCodesDialog, setShowCodesDialog] = useState<boolean>(false);
  const [displayedBackupCodes, setDisplayedBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);

  // General Confirm password for disabling MFA states
  const [isConfirmDisableOpen, setIsConfirmDisableOpen] = useState<boolean>(false);
  const [disableMethod, setDisableMethod] = useState<"totp" | "email" | "passkey" | null>(null);
  const [disablePasskeyId, setDisablePasskeyId] = useState<string | null>(null);

  // Password Criteria Validator
  const validatePassword = (value: string): void => {
    setPasswordCriteria({
      length: value.length >= 16,
      maxLength: value.length <= 64,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]{2,}/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]`]/.test(value),
    });
  };

  const isPasswordValid =
    !newPassword ||
    (passwordCriteria.length &&
      passwordCriteria.maxLength &&
      passwordCriteria.uppercase &&
      passwordCriteria.number &&
      passwordCriteria.special);

  // Fetch user MFA settings on mount / session change
  const fetchMfaSettings = async (): Promise<void> => {
    if (!session?.user?.username || !session?.accessToken) return;
    try {
      const statusRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/status`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setTotpEnabled(statusData.totpEnabled);
        setEmailMfaEnabled(statusData.emailMfaEnabled);
        setHasBackupCodes(statusData.hasBackupCodes);
      }

      // Fetch passkeys
      const passkeysRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/passkeys`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (passkeysRes.ok) {
        const passkeysData = await passkeysRes.json();
        setPasskeys(Array.isArray(passkeysData) ? passkeysData : []);
      }
    } catch (err) {
      console.error("Error fetching MFA settings:", err);
    }
  };

  const fetchDevices = async (): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const devRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/devices`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData);
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetchMfaSettings();
      fetchDevices();
    }
  }, [session]);

  const handleRevokeDevice = async (deviceId: string): Promise<void> => {
    if (!session?.accessToken) return;
    if (!window.confirm("Are you sure you want to revoke trust for this device? It will lose access to decrypt E2EE files and chat messages.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/device/${deviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success("Device revoked successfully.");
        fetchDevices();
      } else {
        throw new Error("Failed to revoke device");
      }
    } catch (err: any) {
      toast.error(err.message || "Revoke failed.");
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    if (!currentPassword) {
      toast.error("Current password is required to change password.");
      return;
    }

    if (!newPassword || !isPasswordValid) {
      toast.error("New password does not meet criteria.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    executePasswordChange();
  };

  const executePasswordChange = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.accessToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateData.message || "Failed to change password.");
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordTouched(false);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/totp/setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to initialize TOTP setup");
      const data = await res.json();
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/totp/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.accessToken}`,
        },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify TOTP code");

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/email/send-setup-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to send verification email");
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/email/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.accessToken}`,
        },
        body: JSON.stringify({ code: emailOtpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify email code");

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
      const optionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/passkey/register-options`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });
      if (!optionsRes.ok) throw new Error("Failed to fetch registration options");
      const options = await optionsRes.json();

      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/passkey/register-verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.accessToken}`,
        },
        body: JSON.stringify({
          response: attestationResponse,
          name: passkeyNickname,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || "Failed to verify Passkey registration");

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
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/user/mfa/totp/disable`;
      } else if (disableMethod === "email") {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/user/mfa/email/disable`;
      } else if (disableMethod === "passkey" && disablePasskeyId) {
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/user/mfa/passkey/${disablePasskeyId}`;
        method = "DELETE";
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to disable MFA method");
      }

      toast.success(`${disableMethod === "passkey" ? "Passkey" : disableMethod?.toUpperCase()} disabled/removed successfully.`);
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
    if (!window.confirm("Regenerating backup codes will invalidate your current ones. Continue?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/backup-codes/regenerate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to regenerate backup codes");
      const data = await res.json();
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

  return (
    <div className="space-y-6">
      {/* Passwords change card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sec-current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="sec-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 px-3 pr-9"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                >
                  {showCurrentPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="sec-new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  maxLength={64}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    validatePassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  onFocus={() => { if (!passwordTouched && newPassword.length > 0) setPasswordTouched(true); }}
                  onBlur={() => setPasswordTouched(false)}
                  placeholder="••••••••"
                  className={cn(
                    "h-9 px-3 pr-9",
                    newPassword && !isPasswordValid && "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/30"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>

              {(passwordTouched || (newPassword.length > 0 && !isPasswordValid)) && (
                <div className="mt-1.5 p-3 rounded-xl bg-muted/35 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Password Criteria
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {[
                      { key: "length", label: "Min 16 characters" },
                      { key: "maxLength", label: "Max 64 characters" },
                      { key: "uppercase", label: "One uppercase letter" },
                      { key: "number", label: "Two numbers" },
                      { key: "special", label: "One special character" },
                    ].map((item) => (
                      <li
                        key={item.key}
                        className={cn(
                          "flex items-center gap-2 text-[11px] transition-all duration-200",
                          passwordCriteria[item.key as keyof typeof passwordCriteria]
                            ? "text-emerald-500 font-medium"
                            : "text-muted-foreground/60",
                        )}
                      >
                        <div
                          className={cn(
                            "size-1.5 rounded-full transition-all",
                            passwordCriteria[item.key as keyof typeof passwordCriteria]
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-muted-foreground/30",
                          )}
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="sec-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "h-9 px-3 pr-9",
                    confirmPassword && newPassword !== confirmPassword && "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/30"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-destructive mt-1">Passwords do not match.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MFA Panel Intro */}
        <Card className="flex flex-col justify-between relative overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="size-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                Protection Active
              </span>
            </div>
            <CardTitle className="text-lg font-bold">Multi-Factor Authentication (MFA)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              Add an extra layer of security to your Runa account. By activating MFA, logins will require not only your password but also verification via passkeys, email codes, or authenticator app tokens.
            </CardDescription>
          </CardHeader>
          {hasBackupCodes && (
            <CardContent className="pt-0">
              <div className="relative z-10 p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    Recovery System Active
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Generate backup codes in case you lose access to your primary authentication devices.
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

      {/* Save Password buttons (Local to Password change) */}
      {(currentPassword || newPassword || confirmPassword) && (
        <div className="flex justify-end gap-3 p-4 rounded-xl border border-border bg-muted/10 animate-in fade-in duration-200">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            Clear Fields
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword || !isPasswordValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </div>
      )}

      {/* List of MFA options */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Verification Methods
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Authenticator App (TOTP) */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Smartphone className="size-4.5" />
                </div>
                <UiBadge variant={totpEnabled ? "default" : "outline"}>
                  {totpEnabled ? "Active" : "Inactive"}
                </UiBadge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">Authenticator App</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Use application tools like Google Authenticator or 1Password to generate 6-digit verification codes.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={totpEnabled ? () => { setDisableMethod("totp"); setIsConfirmDisableOpen(true); } : initiateTotpSetup}
                variant={totpEnabled ? "outline" : "default"}
                className={cn(
                  "w-full h-9 rounded-xl font-semibold text-xs transition-all cursor-pointer",
                  totpEnabled && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                )}
              >
                {totpEnabled ? "Disconnect" : "Setup TOTP"}
              </Button>
            </CardFooter>
          </Card>

          {/* Email Verification OTP */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Mail className="size-4.5" />
                </div>
                <UiBadge variant={emailMfaEnabled ? "default" : "outline"}>
                  {emailMfaEnabled ? "Active" : "Inactive"}
                </UiBadge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">Email One-Time Code</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Receive temporary verification codes sent to your primary registered email address on login attempt.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={emailMfaEnabled ? () => { setDisableMethod("email"); setIsConfirmDisableOpen(true); } : initiateEmailMfaSetup}
                variant={emailMfaEnabled ? "outline" : "default"}
                className={cn(
                  "w-full h-9 rounded-xl font-semibold text-xs transition-all cursor-pointer",
                  emailMfaEnabled && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                )}
              >
                {emailMfaEnabled ? "Disconnect" : "Setup Email OTP"}
              </Button>
            </CardFooter>
          </Card>

          {/* WebAuthn Passkeys */}
          <Card className="flex flex-col justify-between">
            <CardHeader className="space-y-2 pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Key className="size-4.5" />
                </div>
                <UiBadge variant={passkeys.length > 0 ? "default" : "outline"}>
                  {passkeys.length > 0 ? `${passkeys.length} Registered` : "Inactive"}
                </UiBadge>
              </div>
              <CardTitle className="text-sm font-bold text-foreground">Passkeys / Biometrics</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Log in passwordlessly or complete 2FA securely using Face ID, Touch ID, Windows Hello, or hardware keys.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={() => setIsPasskeyRegisterOpen(true)}
                className="w-full h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                Add Passkey
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Passkey Management List */}
      {passkeys.length > 0 && (
        <div className="p-4 rounded-2xl border border-border bg-card/15 mt-2">
          <h5 className="text-xs font-bold text-foreground mb-3">Registered Passkeys</h5>
          <div className="divide-y divide-border space-y-2.5">
            {passkeys.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-bold text-foreground block">{pk.name || "Unnamed Passkey"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    Added: {new Date(pk.createdAt).toLocaleString()}
                  </span>
                </div>
                <Button
                  onClick={() => triggerDeletePasskey(pk.id)}
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Management Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Connected Devices
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-4 rounded-2xl border border-border bg-card/10 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                  <Smartphone className="size-4.5" />
                </div>
                <div className="space-y-0.5 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground truncate">
                      {device.deviceName}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                    {device.userAgent || "Unknown User Agent"}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 block">
                    Last Active: {new Date(device.lastActiveAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleRevokeDevice(device.id)}
                variant="ghost"
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
              >
                <Trash className="size-4" />
              </Button>
            </div>
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

      {/* ── Setup Authenticator app Dialog ── */}
      <Dialog open={isTotpSetupOpen} onOpenChange={setIsTotpSetupOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
          <DialogHeader className="pb-2 text-center w-full">
            <DialogTitle className="text-md font-bold text-center">Setup Authenticator App</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
              Scan the QR code below or enter the secret key manually into your TOTP application.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 my-4 p-4 rounded-2xl border border-border bg-white">
            <canvas ref={qrCanvasRef} className="rounded-lg" />
          </div>

          <div className="w-full space-y-3">
            <div className="p-3.5 rounded-xl bg-muted border border-border flex flex-col gap-1 text-center relative isolate">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Manual Secret Key</span>
              <span className="text-xs font-mono font-bold text-primary select-all break-all tracking-wider">{totpSecret}</span>
            </div>

            <div className="space-y-1.5 pt-2 flex flex-col items-center">
              <Label htmlFor="totp-ver-code" className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Verification Code</Label>
              <InputOTP
                maxLength={6}
                value={totpCode}
                onChange={(val) => setTotpCode(val.replace(/\D/g, ""))}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex justify-end gap-3 w-full pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsTotpSetupOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEnableTotp}
              disabled={totpCode.length !== 6 || isSubmitting}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {isSubmitting ? "Enabling..." : "Verify & Enable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Setup Email Dialog ── */}
      <Dialog open={isEmailSetupOpen} onOpenChange={setIsEmailSetupOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-md font-bold">Setup Email MFA</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter the 6-digit verification code sent to your primary email address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 flex flex-col items-center">
            <div className="space-y-1.5 flex flex-col items-center">
              <Label htmlFor="email-setup-code" className="mb-1.5">Verification Code</Label>
              <InputOTP
                maxLength={6}
                value={emailOtpCode}
                onChange={(val) => setEmailOtpCode(val.replace(/\D/g, ""))}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsEmailSetupOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmEnableEmailMfa}
              disabled={emailOtpCode.length !== 6 || isSubmitting}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {isSubmitting ? "Enabling..." : "Verify & Enable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Register Passkey Nickname Dialog ── */}
      <Dialog open={isPasskeyRegisterOpen} onOpenChange={setIsPasskeyRegisterOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-md font-bold">Register a Passkey</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Assign a nickname for this device passkey to help manage it later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="passkey-nickname">Passkey Name</Label>
              <Input
                id="passkey-nickname"
                value={passkeyNickname}
                onChange={(e) => setPasskeyNickname(e.target.value)}
                placeholder="e.g. MacBook Pro Chrome, My Phone Hello"
                className="h-10 px-3 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsPasskeyRegisterOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={registerPasskey}
              disabled={!passkeyNickname.trim() || isSubmitting}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {isSubmitting ? "Registering..." : "Verify & Register"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Disable Dialog ── */}
      <Dialog open={isConfirmDisableOpen} onOpenChange={setIsConfirmDisableOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-md font-bold text-destructive">
              Confirm Disconnection
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to disable or remove this authentication method? This could weaken your account security.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsConfirmDisableOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={executeDisableMfa}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {isSubmitting ? "Processing..." : "Confirm & Disable"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Backup Codes Display Dialog ── */}
      <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col items-center">
          <DialogHeader className="pb-2 text-center w-full">
            <div className="mx-auto size-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <ShieldCheck className="size-5 animate-pulse" />
            </div>
            <DialogTitle className="text-md font-bold text-center">Save Your Backup Codes</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
              Store these codes safely. They are your fallback recovery codes. Each code can be used exactly once.
            </DialogDescription>
          </DialogHeader>

          {/* List of backup codes */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl border border-border bg-muted/40 font-mono font-bold tracking-wider text-sm my-4 text-center select-all leading-normal">
            {displayedBackupCodes.map((code, index) => (
              <div key={index} className="text-muted-foreground py-1 text-xs">
                {code}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 mb-3 flex items-start gap-2.5 text-left w-full text-[11px] text-amber-500/80 dark:text-amber-300">
            <AlertCircle className="size-4 shrink-0 mt-0.5 animate-bounce" />
            <p className="leading-relaxed">
              Runa support cannot recover these codes for you. If you lose your auth devices and backup codes, you will be permanently locked out.
            </p>
          </div>

          <div className="flex gap-2.5 w-full">
            <Button
              onClick={copyBackupCodesToClipboard}
              variant="outline"
              className="flex-1 h-9 rounded-xl border border-border hover:bg-muted text-xs font-semibold"
            >
              {copiedCodes ? <Check className="size-3.5 mr-1.5 text-emerald-500" /> : <Copy className="size-3.5 mr-1.5" />}
              {copiedCodes ? "Copied" : "Copy Codes"}
            </Button>
            <Button
              onClick={downloadBackupCodesFile}
              variant="outline"
              className="flex-1 h-9 rounded-xl border border-border hover:bg-muted text-xs font-semibold"
            >
              <Download className="size-3.5 mr-1.5" />
              Download TXT
            </Button>
          </div>

          <Button
            onClick={() => setShowCodesDialog(false)}
            className="w-full mt-3 h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer"
          >
            I Have Saved These Codes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
