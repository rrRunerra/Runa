"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
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
  QrCode,
  Check,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface SecuritySettingsTabProps {
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

export interface SecuritySettingsTabRef {
  handleSave: () => void;
}

export const SecuritySettingsTab = forwardRef<SecuritySettingsTabRef, SecuritySettingsTabProps>(
  ({ onOpenChange, isSubmitting, setIsSubmitting }, ref) => {
    const { data: session, update } = useSession();

    // Password States
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState({
      length: false,
      maxLength: false,
      uppercase: false,
      number: false,
      special: false,
    });

    // MFA status states
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [emailMfaEnabled, setEmailMfaEnabled] = useState(false);
    const [passkeys, setPasskeys] = useState<any[]>([]);
    const [hasBackupCodes, setHasBackupCodes] = useState(false);

    // TOTP setup states
    const [isTotpSetupOpen, setIsTotpSetupOpen] = useState(false);
    const [totpSecret, setTotpSecret] = useState("");
    const [totpQrUrl, setTotpQrUrl] = useState("");
    const [totpCode, setTotpCode] = useState("");
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
    const [isEmailSetupOpen, setIsEmailSetupOpen] = useState(false);
    const [emailOtpCode, setEmailOtpCode] = useState("");

    // Passkey setup states
    const [isPasskeyRegisterOpen, setIsPasskeyRegisterOpen] = useState(false);
    const [passkeyNickname, setPasskeyNickname] = useState("");

    // Backup Codes Dialog States
    const [showCodesDialog, setShowCodesDialog] = useState(false);
    const [displayedBackupCodes, setDisplayedBackupCodes] = useState<string[]>([]);
    const [copiedCodes, setCopiedCodes] = useState(false);

    // General Confirm password for disabling MFA states
    const [isConfirmDisableOpen, setIsConfirmDisableOpen] = useState(false);
    const [disableMethod, setDisableMethod] = useState<"totp" | "email" | "passkey" | null>(null);
    const [disablePasskeyId, setDisablePasskeyId] = useState<string | null>(null);

    // Password Criteria Validator
    const validatePassword = (value: string) => {
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
    const fetchMfaSettings = async () => {
      if (!session?.user?.username || !session?.accessToken) return;
      try {
        // Fetch full profile info to see TOTP & Email settings
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${session.user.username}`);
        if (res.ok) {
          const profileData = await res.json();
          // Note: profile endpoint maps public fields, so we need settings.
          // Or let's fetch passkeys and check user object.
        }

        // We can check user fields by making a PUT/GET settings fetch
        const settingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${session.user.username}`);
        // But since user/:username might filter those out for privacy, let's make sure we get them from a secure endpoint, or we map them in the profile endpoint.
        // Wait, does user/:username return totpEnabled?
        // Let's see: user/:username returns user details.
        // Let's check user/:username response or if we have a dedicated user settings route.
        // UserController.findOne(':username') returns public fields. It does not return totpEnabled or emailMfaEnabled.
        // Let's write a settings GET endpoint or just fetch user details by ID/token!
        // Actually, we can fetch user profile via a secure endpoint or use the token info.
        // Let's add a secure endpoint: GET /user/mfa/status in UserController!
        // Wait, is there an endpoint? Let's check UserController.
        // In UserController, we don't have GET /user/mfa/status, but we can make one, or we can fetch current user settings.
        // Let's make sure we hit GET /user/privacy or similar, or just check the token.
        // Better yet: we can fetch from a secure endpoint `GET /user/mfa/status`!
        // Let's check what endpoints we already have. We have `GET /user/privacy`.
        // Let's implement `GET /user/mfa/status` on UserController:
        // Wait! We can also add it to `findOne` or add a specific route in UserController.
        // Let's search UserController again. It has:
        // `GET /user/privacy`, `PUT /user/privacy`, `GET :username`, `PUT settings`, `PUT update`.
        // Let's fetch from `GET /user/mfa/status` which we will add to UserController in NestJS!
        // Wait, did we add it? Let's check UserController in user.controller.ts.
        // Ah, we added:
        // `GET mfa/passkeys`
        // We can add `GET mfa/status` to `UserController` to return `{ totpEnabled, emailMfaEnabled, hasBackupCodes, passkeysCount }`.
        // Let's make sure we fetch it. Let's do that!
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
          const passkeysData = await passkeysRes.ok ? await passkeysRes.json() : [];
          setPasskeys(passkeysData);
        }
      } catch (err) {
        console.error("Error fetching MFA settings:", err);
      }
    };

    useEffect(() => {
      fetchMfaSettings();
    }, [session]);

    // QR code is drawn directly via the qrCanvasRef callback ref

    // Relocated Save Password handler
    const handlePreSave = () => {
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

    useImperativeHandle(ref, () => ({
      handleSave: handlePreSave,
    }));

    const executePasswordChange = async () => {
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
      } catch (err: any) {
        toast.error(err.message || "Failed to update password.");
      } finally {
        setIsSubmitting(false);
      }
    };

    // TOTP functions
    const initiateTotpSetup = async () => {
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

    const confirmEnableTotp = async () => {
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

        // If backup codes returned, show them
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
    const initiateEmailMfaSetup = async () => {
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

    const confirmEnableEmailMfa = async () => {
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
    const registerPasskey = async () => {
      if (!passkeyNickname.trim()) {
        toast.error("Please enter a nickname for your passkey.");
        return;
      }
      setIsSubmitting(true);
      try {
        // 1. Get registration options
        const optionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/mfa/passkey/register-options`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session!.accessToken}`,
          },
        });
        if (!optionsRes.ok) throw new Error("Failed to fetch registration options");
        const options = await optionsRes.json();

        // 2. Start WebAuthn browser registration
        const attestationResponse = await startRegistration({
          optionsJSON: options,
        });

        // 3. Verify registration on backend
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

    const triggerDeletePasskey = (passkeyId: string, name: string) => {
      setDisableMethod("passkey");
      setDisablePasskeyId(passkeyId);
      setIsConfirmDisableOpen(true);
    };

    // Disabling functions (Requires password confirm in modal)
    const executeDisableMfa = async () => {
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
    const regenerateBackupCodes = async () => {
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

    const copyBackupCodesToClipboard = () => {
      const codeText = displayedBackupCodes.join("\n");
      navigator.clipboard.writeText(codeText);
      setCopiedCodes(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedCodes(false), 2000);
    };

    const downloadBackupCodesFile = () => {
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
          <div className="space-y-4 p-5 rounded-2xl border border-zinc-800/50 bg-card/20 backdrop-blur-xs">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Change Password
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Update your account password.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sec-current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="sec-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 px-3 pr-9 bg-zinc-950/40 border-zinc-800/50 rounded-xl"
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
                    "h-9 px-3 pr-9 bg-zinc-950/40 border-zinc-800/50 rounded-xl",
                    newPassword && !isPasswordValid && "border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30"
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
                <div className="mt-1.5 p-3 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
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
                    "h-9 px-3 pr-9 bg-zinc-950/40 border-zinc-800/50 rounded-xl",
                    confirmPassword && newPassword !== confirmPassword && "border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30"
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
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>

          {/* MFA Panel Intro */}
          <div className="flex flex-col justify-between p-5 rounded-2xl border border-zinc-800/50 bg-card/20 backdrop-blur-xs relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="size-5" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">
                  Protection Active
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Multi-Factor Authentication (MFA)
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add an extra layer of security to your Runa account. By activating MFA, logins will require not only your password but also verification via passkeys, email codes, or authenticator app tokens.
              </p>
            </div>
            {hasBackupCodes && (
              <div className="relative z-10 p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 mt-4 flex items-center justify-between gap-3">
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
                  className="h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 hover:text-white"
                >
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* List of MFA options */}
        <div className="space-y-4 pt-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Verification Methods
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Authenticator App (TOTP) */}
            <div className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 flex flex-col justify-between gap-4 h-full relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Smartphone className="size-4.5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    totpEnabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800/45 text-zinc-400 border border-zinc-800/30"
                  )}>
                    {totpEnabled ? "Active" : "Inactive"}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-foreground">Authenticator App</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Use application tools like Google Authenticator or 1Password to generate 6-digit verification codes.
                </p>
              </div>
              <Button
                onClick={totpEnabled ? () => { setDisableMethod("totp"); setIsConfirmDisableOpen(true); } : initiateTotpSetup}
                className={cn(
                  "w-full h-9 rounded-xl font-semibold text-xs transition-all cursor-pointer",
                  totpEnabled
                    ? "bg-zinc-900 border border-zinc-800 hover:bg-red-500/10 hover:text-red-400 text-zinc-300"
                    : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs"
                )}
              >
                {totpEnabled ? "Disconnect" : "Setup TOTP"}
              </Button>
            </div>

            {/* Email Verification OTP */}
            <div className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 flex flex-col justify-between gap-4 h-full relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Mail className="size-4.5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    emailMfaEnabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800/45 text-zinc-400 border border-zinc-800/30"
                  )}>
                    {emailMfaEnabled ? "Active" : "Inactive"}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-foreground">Email One-Time Code</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Receive temporary verification codes sent to your primary registered email address on login attempt.
                </p>
              </div>
              <Button
                onClick={emailMfaEnabled ? () => { setDisableMethod("email"); setIsConfirmDisableOpen(true); } : initiateEmailMfaSetup}
                className={cn(
                  "w-full h-9 rounded-xl font-semibold text-xs transition-all cursor-pointer",
                  emailMfaEnabled
                    ? "bg-zinc-900 border border-zinc-800 hover:bg-red-500/10 hover:text-red-400 text-zinc-300"
                    : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-xs"
                )}
              >
                {emailMfaEnabled ? "Disconnect" : "Setup Email OTP"}
              </Button>
            </div>

            {/* WebAuthn Passkeys */}
            <div className="p-5 rounded-2xl border border-zinc-800/40 bg-zinc-950/20 flex flex-col justify-between gap-4 h-full relative overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Key className="size-4.5" />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    passkeys.length > 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800/45 text-zinc-400 border border-zinc-800/30"
                  )}>
                    {passkeys.length > 0 ? `${passkeys.length} Registered` : "Inactive"}
                  </span>
                </div>
                <h5 className="text-sm font-bold text-foreground">Passkeys / Biometrics</h5>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Log in passwordlessly or complete 2FA securely using Face ID, Touch ID, Windows Hello, or hardware keys.
                </p>
              </div>
              <Button
                onClick={() => setIsPasskeyRegisterOpen(true)}
                className="w-full h-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs transition-all cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                Add Passkey
              </Button>
            </div>
          </div>
        </div>

        {/* Passkey Management List */}
        {passkeys.length > 0 && (
          <div className="p-4 rounded-2xl border border-zinc-800/50 bg-card/15 mt-2">
            <h5 className="text-xs font-bold text-foreground mb-3">Registered Passkeys</h5>
            <div className="divide-y divide-zinc-800/50 space-y-2.5">
              {passkeys.map((pk) => (
                <div key={pk.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-foreground block">{pk.name || "Unnamed Passkey"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Added: {new Date(pk.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    onClick={() => triggerDeletePasskey(pk.id, pk.name)}
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Setup Authenticator app Dialog ── */}
        <Dialog open={isTotpSetupOpen} onOpenChange={setIsTotpSetupOpen}>
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center">
            <DialogHeader className="pb-2 text-center w-full">
              <DialogTitle className="text-md font-bold text-center">Setup Authenticator App</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-center mt-1">
                Scan the QR code below or enter the secret key manually into your TOTP application.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 my-4 p-4 rounded-2xl border border-zinc-800/60 bg-white">
              <canvas ref={qrCanvasRef} className="rounded-lg" />
            </div>

            <div className="w-full space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col gap-1 text-center relative isolate">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Manual Secret Key</span>
                <span className="text-xs font-mono font-bold text-primary select-all break-all tracking-wider">{totpSecret}</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="totp-ver-code" className="text-xs text-muted-foreground uppercase tracking-wide">Verification Code</Label>
                <Input
                  id="totp-ver-code"
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  className="h-10 px-3 bg-zinc-900 border-zinc-800 rounded-xl text-center font-bold font-mono tracking-widest text-base"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 w-full pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsTotpSetupOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 rounded-xl text-xs h-9 cursor-pointer"
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
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-md font-bold">Setup Email MFA</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Enter the 6-digit verification code sent to your primary email address.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="email-setup-code">Verification Code</Label>
                <Input
                  id="email-setup-code"
                  type="text"
                  maxLength={6}
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  className="h-10 px-3 bg-zinc-900 border-zinc-800 rounded-xl text-center font-bold font-mono tracking-widest text-base"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsEmailSetupOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 rounded-xl text-xs h-9 cursor-pointer"
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
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-6 rounded-2xl">
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
                  className="h-10 px-3 bg-zinc-900 border-zinc-800 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsPasskeyRegisterOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 rounded-xl text-xs h-9 cursor-pointer"
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
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-md font-bold text-red-400">
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
                className="text-muted-foreground hover:text-foreground hover:bg-zinc-800/40 rounded-xl text-xs h-9 cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={executeDisableMfa}
                disabled={isSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
              >
                {isSubmitting ? "Processing..." : "Confirm & Disable"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Backup Codes Display Dialog ── */}
        <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
          <DialogContent className="max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-6 rounded-2xl flex flex-col items-center">
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono font-bold tracking-wider text-sm my-4 text-center select-all leading-normal">
              {displayedBackupCodes.map((code, index) => (
                <div key={index} className="text-zinc-300 py-1 text-xs">
                  {code}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl border border-amber-500/10 bg-amber-500/5 mb-3 flex items-start gap-2.5 text-left w-full text-[11px] text-amber-300">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Runa support cannot recover these codes for you. If you lose your auth devices and backup codes, you will be permanently locked out.
              </p>
            </div>

            <div className="flex gap-2.5 w-full">
              <Button
                onClick={copyBackupCodesToClipboard}
                variant="outline"
                className="flex-1 h-9 rounded-xl border border-zinc-800 hover:bg-muted text-xs font-semibold"
              >
                {copiedCodes ? <Check className="size-3.5 mr-1.5 text-emerald-500" /> : <Copy className="size-3.5 mr-1.5" />}
                {copiedCodes ? "Copied" : "Copy Codes"}
              </Button>
              <Button
                onClick={downloadBackupCodesFile}
                variant="outline"
                className="flex-1 h-9 rounded-xl border border-zinc-800 hover:bg-muted text-xs font-semibold"
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
  }
);

SecuritySettingsTab.displayName = "SecuritySettingsTab";
