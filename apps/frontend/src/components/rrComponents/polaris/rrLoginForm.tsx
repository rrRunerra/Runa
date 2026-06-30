"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Fingerprint,
  Smartphone,
  Mail,
  Key,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import RrLapplandWelcomeImage from "../rrImages/rrLapplandWelcomeImage";
import RrLapplandBackupCode from "../rrImages/rrLapplandBackupCode";
import RrLapplandBackupCodeError from "../rrImages/rrLapplandBackupCodeError";
import RrLapplandEmail from "../rrImages/rrLapplandEmail";
import RrLapplandEmailError from "../rrImages/rrLapplandEmailError";
import RrLapplandPasskey from "../rrImages/rrLapplandPasskey";
import RrLapplandPasskeyDenied from "../rrImages/rrLapplandPasskeyDenied";
import RrLapplandTOTP from "../rrImages/rrLapplandTOTP";
import RrLapplandTOTPError from "../rrImages/rrLapplandTOTPError";
import RrLapplandUserNotFound from "../rrImages/rrLapplandUserNotFound";
import RrLapplandWrongPassword from "../rrImages/rrLapplandWrongPassword";
import { RESERVED_KEYWORDS } from "@/lib/rrReservedKeywords";

export interface rrLoginFormProps {
  identifier: string;
  setIdentifier: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword?: boolean;
  setShowPassword?: (val: boolean) => void;
  loading: boolean;
  message: string;
  setMessage: (val: string) => void;
  fieldErrors: { identifier?: string } | null;
  setFieldErrors: (val: { identifier?: string } | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onPasskeyLogin: () => void;

  // Login Code
  onGenerateLoginCode?: () => void;
  onCancelLoginCode?: () => void;
  loginCodeState?: "none" | "generating" | "code" | "error";
  generatedCode?: string;

  // MFA
  mfaRequired: boolean;
  setMfaRequired: (val: boolean) => void;
  activeMfaMethod:
    | "totp"
    | "email"
    | "passkey"
    | "backup"
    | "device_notification"
    | null;
  setActiveMfaMethod: (
    val: "totp" | "email" | "passkey" | "backup" | "device_notification" | null,
  ) => void;
  mfaMethods: Array<
    "totp" | "email" | "passkey" | "backup" | "device_notification"
  >;
  mfaCode: string;
  setMfaCode: (val: string) => void;
  onVerifyMfa: (e: React.FormEvent) => void;
  onSelectMfaMethod: (
    method: "totp" | "email" | "passkey" | "backup" | "device_notification",
  ) => void;
  tempToken: string;
  sendEmailOtp: (token: string) => void;
  emailCodeSent: boolean;
  devices?: { id: string; deviceName: string }[];
  selectedDeviceId?: string;
  setSelectedDeviceId?: (val: string) => void;
  sendDeviceNotification?: (token: string, deviceId: string) => void;
  deviceCodeSent?: boolean;
}

export function RrLoginForm({
  className,
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword = false,
  setShowPassword = () => {},
  loading,
  message,
  setMessage,
  fieldErrors,
  setFieldErrors,
  onSubmit,
  onPasskeyLogin,
  onGenerateLoginCode,
  onCancelLoginCode,
  loginCodeState = "none",
  generatedCode,
  mfaRequired,
  setMfaRequired,
  activeMfaMethod,
  setActiveMfaMethod,
  mfaMethods,
  mfaCode,
  setMfaCode,
  onVerifyMfa,
  onSelectMfaMethod,
  tempToken,
  sendEmailOtp,
  emailCodeSent,
  devices = [],
  selectedDeviceId = "",
  setSelectedDeviceId = () => {},
  sendDeviceNotification = () => {},
  deviceCodeSent = false,
  ...props
}: rrLoginFormProps & React.ComponentProps<"div">) {
  const hasError = message?.includes("❌");
  const isPasswordError =
    hasError &&
    (message.toLowerCase().includes("password") ||
      message.toLowerCase().includes("credential") ||
      message.toLowerCase().includes("incorrect"));
  const isIdentifierError =
    hasError &&
    (message.toLowerCase().includes("user") ||
      message.toLowerCase().includes("email") ||
      message.toLowerCase().includes("username") ||
      message.toLowerCase().includes("not found"));
  const isTotpError =
    hasError &&
    activeMfaMethod === "totp" &&
    (message.toLowerCase().includes("code") ||
      message.toLowerCase().includes("response") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("fail"));
  const isEmailError =
    hasError &&
    activeMfaMethod === "email" &&
    (message.toLowerCase().includes("code") ||
      message.toLowerCase().includes("response") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("fail"));
  const isBackupError =
    hasError &&
    activeMfaMethod === "backup" &&
    (message.toLowerCase().includes("code") ||
      message.toLowerCase().includes("response") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("fail"));

  const [loginView, setLoginView] = React.useState<"credentials" | "options" | "code">("credentials");
  const [resendCooldown, setResendCooldown] = React.useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  React.useEffect(() => {
    if (emailCodeSent || deviceCodeSent) {
      setResendCooldown(60);
    }
  }, [emailCodeSent, deviceCodeSent]);

  const handleResendEmail = () => {
    if (resendCooldown > 0 || loading) return;
    sendEmailOtp(tempToken);
    setResendCooldown(60);
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <Card className="overflow-hidden p-0 bg-card border-border rounded-2xl shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8 flex flex-col justify-center h-[600px]">
            <AnimatePresence mode="wait">
              {!mfaRequired ? (
                loginView === "credentials" ? (
                  <motion.form
                    key="login-form-credentials"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={onSubmit}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex flex-col items-center gap-1.5 text-center mb-2">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Welcome back
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Login to your Polaris account
                      </p>
                    </div>

                    {/* Identifier field */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="identifier"
                          className="text-xs font-semibold ml-0.5 text-muted-foreground uppercase tracking-wider"
                        >
                          Email or Username
                        </Label>
                        {(fieldErrors?.identifier || isIdentifierError) && (
                          <span className="text-[10px] font-semibold text-destructive">
                            {fieldErrors?.identifier ||
                              message.replace("❌", "").trim()}
                          </span>
                        )}
                      </div>
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="m@example.com"
                        required
                        value={identifier}
                        onChange={(e) => {
                          if (message) setMessage("");
                          const val = e.target.value;
                          let sanitized = val;
                          if (!val.includes("@")) {
                            sanitized = val
                              .toLowerCase()
                              .replace(/[^a-z0-9_]/g, "");
                          }
                          setIdentifier(sanitized);

                          if (
                            !sanitized.includes("@") &&
                            RESERVED_KEYWORDS.has(sanitized)
                          ) {
                            setFieldErrors({
                              identifier: `Username is reserved ("${sanitized}")`,
                            });
                          } else {
                            setFieldErrors(null);
                          }
                        }}
                        disabled={loading}
                        className={cn(
                          "h-10 px-3 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-sm rounded-lg transition-colors",
                          (isIdentifierError || !!fieldErrors?.identifier) &&
                            "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                        )}
                      />
                    </div>

                    {/* Password field */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="password"
                          className="text-xs font-semibold ml-0.5 text-muted-foreground uppercase tracking-wider"
                        >
                          Password
                        </Label>
                        {isPasswordError ? (
                          <span className="text-[10px] font-semibold text-destructive">
                            {message.replace("❌", "").trim()}
                          </span>
                        ) : (
                          <Link
                            href="/forgot-password"
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors shrink-0"
                          >
                            Forgot your password?
                          </Link>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => {
                            if (message) setMessage("");
                            setPassword(e.target.value);
                          }}
                          disabled={loading}
                          className={cn(
                            "h-10 pl-3 pr-10 bg-background border-input text-foreground focus-visible:ring-primary/20 text-sm rounded-lg transition-colors",
                            isPasswordError &&
                              "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors p-1"
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={loading || !!fieldErrors?.identifier}
                      className="w-full h-10 shadow-md font-semibold"
                    >
                      {loading ? "Logging in..." : "Login"}
                    </Button>

                    {/* More Options option */}
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLoginView("options")}
                        disabled={loading}
                        className="w-full h-10 border border-border hover:bg-accent text-accent-foreground hover:text-foreground font-semibold rounded-lg text-xs cursor-pointer gap-2 transition-colors"
                      >
                        More Options
                      </Button>
                      {hasError &&
                        !(isIdentifierError || isPasswordError) && (
                          <p className="text-xs text-destructive font-medium text-center">
                            {message.replace("❌", "").trim()}
                          </p>
                        )}
                    </div>

                    {/* Separator */}
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="px-2 text-[10px] tracking-wider font-bold text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    {/* Social Login Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        type="button"
                        className="h-10 border-border hover:bg-accent text-accent-foreground hover:text-foreground rounded-lg cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="size-4"
                        >
                          <path
                            d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="sr-only">Login with Apple</span>
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        className="h-10 border-border hover:bg-accent text-accent-foreground hover:text-foreground rounded-lg cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="size-4"
                        >
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="sr-only">Login with Google</span>
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        className="h-10 border-border hover:bg-accent text-accent-foreground hover:text-foreground rounded-lg cursor-pointer"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="size-4"
                        >
                          <path
                            d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="sr-only">Login with Meta</span>
                      </Button>
                    </div>

                    {/* Sign up Link */}
                    <div className="text-center text-xs text-muted-foreground mt-2">
                      Don&apos;t have an account?{" "}
                      <Link
                        href="/polaris/register"
                        className="text-foreground font-semibold hover:underline underline-offset-2 transition-colors"
                      >
                        Sign up
                      </Link>
                    </div>
                  </motion.form>
                ) : loginView === "options" ? (
                  <motion.div
                    key="login-form-options"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex flex-col items-center gap-1.5 text-center mb-2">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Login Options
                      </h1>
                      <p className="text-sm text-muted-foreground">
                        Select an alternate method to log in
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Login with Passkey */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onPasskeyLogin}
                        disabled={loading}
                        className="w-full h-12 border border-border hover:bg-accent text-accent-foreground hover:text-foreground font-semibold rounded-xl text-xs cursor-pointer gap-3 transition-colors justify-start px-4"
                      >
                        <Fingerprint className="size-5 text-muted-foreground" />
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-bold text-foreground">Use a Passkey</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Use biometrics or security keys</span>
                        </div>
                      </Button>

                      {/* Login with Code */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setLoginView("code");
                          onGenerateLoginCode?.();
                        }}
                        disabled={loading}
                        className="w-full h-12 border border-border hover:bg-accent text-accent-foreground hover:text-foreground font-semibold rounded-xl text-xs cursor-pointer gap-3 transition-colors justify-start px-4"
                      >
                        <Key className="size-5 text-muted-foreground" />
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-bold text-foreground">Login with Code</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Link this device using another active session</span>
                        </div>
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLoginView("credentials")}
                      className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mx-auto pt-2"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to credentials login
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="login-form-code"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Login with Code
                      </h1>
                    </div>

                    {loginCodeState === "generating" && (
                      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Generating code...</span>
                      </div>
                    )}

                    {loginCodeState === "code" && (
                      <div className="flex flex-col items-center gap-4 py-3 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                          Your Device Link Code
                        </span>
                        <div className="text-2xl font-bold tracking-widest text-primary font-mono select-all bg-muted/20 border border-border rounded-xl px-5 py-3.5">
                          {generatedCode ? `${generatedCode.slice(0, 3)} - ${generatedCode.slice(3, 6)} - ${generatedCode.slice(6)}` : ""}
                        </div>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                          To log in, open your account settings on another logged-in device, navigate to <strong>Security Settings</strong>, and enter this code.
                        </p>
                        <div className="flex items-center gap-2 mt-4">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider animate-pulse">
                            Waiting for authorization...
                          </span>
                        </div>
                      </div>
                    )}

                    {loginCodeState === "error" && (
                      <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <span className="text-xs text-destructive font-medium">❌ Failed to generate login code.</span>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onGenerateLoginCode?.()}
                          className="text-xs rounded-lg"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setLoginView("options");
                        onCancelLoginCode?.();
                      }}
                      className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mx-auto pt-2"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to options
                    </button>
                  </motion.div>
                )
              ) : (
                /* MFA Flow rendering */
                <motion.div
                  key="mfa-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center mb-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      MFA Verification
                    </h1>
                  </div>

                  {activeMfaMethod === "passkey" && (
                    <div className="flex flex-col items-center gap-4 py-3 text-center">
                      <div className="size-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                        <Fingerprint className="size-8 text-primary" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-bold text-foreground">
                          Passkey Prompt Active
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                          Your browser should request verification using
                          biometrics or your security key.
                        </p>
                      </div>
                      <Button
                        onClick={() => onSelectMfaMethod("passkey")}
                        className="h-10 px-5 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-secondary-foreground cursor-pointer"
                        disabled={loading}
                      >
                        Retry Passkey Prompt
                      </Button>
                      {hasError &&
                        (message.toLowerCase().includes("passkey") ||
                          message.toLowerCase().includes("allowed") ||
                          message.toLowerCase().includes("cancelled") ||
                          message.toLowerCase().includes("denied")) && (
                          <p className="text-xs text-destructive font-medium max-w-xs leading-relaxed mt-1">
                            {message.replace("❌", "").trim()}
                          </p>
                        )}
                    </div>
                  )}

                  {activeMfaMethod === "device_notification" && (
                    <form
                      onSubmit={onVerifyMfa}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <Smartphone className="size-6 text-primary" />
                        <Label className="text-xs font-bold text-foreground">
                          Device Notification MFA
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Send a push notification to one of your trusted
                          devices.
                        </p>
                      </div>

                      {!deviceCodeSent ? (
                        <div className="flex flex-col gap-3">
                          <Label className="text-xs font-bold text-muted-foreground">
                            Select Device
                          </Label>
                          <select
                            value={selectedDeviceId}
                            onChange={(e) =>
                              setSelectedDeviceId(e.target.value)
                            }
                            className="h-10 px-3 bg-background border border-input rounded-lg text-sm focus-visible:ring-primary/20"
                          >
                            <option value="" disabled>
                              Select a device
                            </option>
                            {devices.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.deviceName}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            onClick={() =>
                              sendDeviceNotification(
                                tempToken,
                                selectedDeviceId,
                              )
                            }
                            disabled={loading || !selectedDeviceId}
                            className="w-full h-10 shadow-md font-semibold mt-2"
                          >
                            {loading ? "Sending..." : "Send Notification"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] text-center text-primary font-medium">
                            Notification sent! Enter the code shown on your
                            device.
                          </p>
                          <Input
                            id="mfa-device-code"
                            type="text"
                            maxLength={6}
                            value={mfaCode}
                            onChange={(e) => {
                              if (message) setMessage("");
                              setMfaCode(e.target.value.replace(/\D/g, ""));
                            }}
                            placeholder="e.g. 123456"
                            className="h-12 bg-background border-input rounded-xl text-center font-bold tracking-widest text-lg font-mono text-foreground focus-visible:ring-primary/20 transition-colors"
                            autoFocus
                            disabled={loading}
                          />
                          <Button
                            type="submit"
                            disabled={mfaCode.length !== 6 || loading}
                            className="w-full h-10 font-semibold rounded-lg text-sm shadow-md"
                          >
                            {loading ? "Verifying..." : "Verify Code"}
                          </Button>
                        </div>
                      )}

                      {hasError && !message.includes("Notification sent") && (
                        <p className="text-xs text-destructive font-medium text-center">
                          {message.replace("❌", "").trim()}
                        </p>
                      )}
                    </form>
                  )}

                  {activeMfaMethod === "totp" && (
                    <form
                      onSubmit={onVerifyMfa}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <Smartphone className="size-6 text-indigo-400" />
                        <Label
                          htmlFor="mfa-otp-code"
                          className={cn(
                            "text-xs font-bold transition-colors",
                            isTotpError
                              ? "text-destructive font-bold"
                              : "text-foreground",
                          )}
                        >
                          {isTotpError
                            ? message.replace("❌", "").trim()
                            : "Authenticator App Code"}
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Enter the 6-digit verification code from your auth
                          app.
                        </p>
                      </div>
                      <Input
                        id="mfa-otp-code"
                        type="text"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => {
                          if (message) setMessage("");
                          setMfaCode(e.target.value.replace(/\D/g, ""));
                        }}
                        placeholder="e.g. 123456"
                        className={cn(
                          "h-12 bg-background border-input rounded-xl text-center font-bold tracking-widest text-lg font-mono text-foreground focus-visible:ring-primary/20 transition-colors",
                          isTotpError &&
                            "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                        )}
                        autoFocus
                        disabled={loading}
                      />
                      <Button
                        type="submit"
                        disabled={mfaCode.length !== 6 || loading}
                        className="w-full h-10  font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-md"
                      >
                        {loading ? "Verifying..." : "Verify Code"}
                      </Button>
                      {hasError && !isTotpError && (
                        <p className="text-xs text-destructive font-medium text-center">
                          {message.replace("❌", "").trim()}
                        </p>
                      )}
                    </form>
                  )}

                  {activeMfaMethod === "email" && (
                    <form
                      onSubmit={onVerifyMfa}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <Mail className="size-6 text-sky-400" />
                        <Label
                          htmlFor="mfa-email-code"
                          className={cn(
                            "text-xs font-bold transition-colors",
                            isEmailError
                              ? "text-destructive font-bold"
                              : "text-foreground",
                          )}
                        >
                          {isEmailError
                            ? message.replace("❌", "").trim()
                            : "Email One-Time Code"}
                        </Label>
                        {message &&
                        message.includes("Verification code sent") ? (
                          <p className="text-[10px] text-primary font-medium">
                            Verification code sent to your email.
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            A 6-digit code has been sent to your primary email
                            address.
                          </p>
                        )}
                      </div>
                      <Input
                        id="mfa-email-code"
                        type="text"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => {
                          if (message) setMessage("");
                          setMfaCode(e.target.value.replace(/\D/g, ""));
                        }}
                        placeholder="e.g. 123456"
                        className={cn(
                          "h-12 bg-background border-input rounded-xl text-center font-bold tracking-widest text-lg font-mono text-foreground focus-visible:ring-primary/20 transition-colors",
                          isEmailError &&
                            "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                        )}
                        autoFocus
                        disabled={loading}
                      />
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResendEmail}
                          disabled={loading || resendCooldown > 0}
                          className="flex-1 h-10 rounded-lg border border-border hover:bg-accent text-accent-foreground text-xs font-semibold hover:text-foreground transition-colors"
                        >
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend Email"}
                        </Button>
                        <Button
                          type="submit"
                          disabled={mfaCode.length !== 6 || loading}
                          className="flex-1 h-10 shadow-md font-semibold"
                        >
                          {loading ? "Verifying..." : "Verify"}
                        </Button>
                      </div>
                      {hasError &&
                        !isEmailError &&
                        !message.includes("Verification code sent") && (
                          <p className="text-xs text-destructive font-medium text-center">
                            {message.replace("❌", "").trim()}
                          </p>
                        )}
                    </form>
                  )}

                  {activeMfaMethod === "backup" && (
                    <form
                      onSubmit={onVerifyMfa}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <Key className="size-6 text-primary" />
                        <Label
                          htmlFor="mfa-backup-code"
                          className={cn(
                            "text-xs font-bold transition-colors",
                            isBackupError
                              ? "text-destructive font-bold"
                              : "text-foreground",
                          )}
                        >
                          {isBackupError
                            ? message.replace("❌", "").trim()
                            : "Backup Recovery Code"}
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Enter one of your 10-character backup recovery codes.
                        </p>
                      </div>
                      <Input
                        id="mfa-backup-code"
                        type="text"
                        maxLength={10}
                        value={mfaCode}
                        onChange={(e) => {
                          if (message) setMessage("");
                          setMfaCode(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, ""),
                          );
                        }}
                        placeholder="e.g. a1b2c3d4e5"
                        className={cn(
                          "h-12 bg-background border-input rounded-xl text-center font-bold tracking-widest text-sm font-mono text-foreground focus-visible:ring-primary/20 transition-colors",
                          isBackupError &&
                            "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                        )}
                        autoFocus
                        disabled={loading}
                      />
                      <Button
                        type="submit"
                        disabled={mfaCode.length !== 10 || loading}
                        className="w-full h-10  font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-md"
                      >
                        {loading ? "Verifying..." : "Submit Recovery Code"}
                      </Button>
                      {hasError && !isBackupError && (
                        <p className="text-xs text-destructive font-medium text-center">
                          {message.replace("❌", "").trim()}
                        </p>
                      )}
                    </form>
                  )}

                  {/* Switch Methods list */}
                  {mfaMethods.length > 1 && (
                    <div className="flex flex-col gap-2 mt-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block text-center">
                        Try Another Method
                      </span>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {mfaMethods.map((m) => {
                          if (m === activeMfaMethod) return null;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => onSelectMfaMethod(m)}
                              className="px-2.5 py-1.5 rounded-lg border border-border bg-background/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-all cursor-pointer"
                            >
                              {m === "passkey" && "Passkey"}
                              {m === "device_notification" &&
                                "Device Notification"}
                              {m === "totp" && "Authenticator Code"}
                              {m === "email" && "Email Code"}
                              {m === "backup" && "Backup Code"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMfaRequired(false)}
                    className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer mx-auto pt-2"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to credentials login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error/Status Messages removed for a cleaner inline visual layout */}
          </div>

          {/* Right side cover image block */}
          <div className="relative hidden bg-muted border-l border-border md:flex items-center justify-center overflow-hidden w-full h-full">
            {(() => {
              let ActiveComponent: React.ComponentType<any>;
              let stateKey: string;

              if (mfaRequired) {
                if (activeMfaMethod === "passkey") {
                  if (hasError) {
                    ActiveComponent = RrLapplandPasskeyDenied;
                    stateKey = "mfa-passkey-denied";
                  } else {
                    ActiveComponent = RrLapplandPasskey;
                    stateKey = "mfa-passkey-prompt";
                  }
                } else if (activeMfaMethod === "totp") {
                  if (isTotpError) {
                    ActiveComponent = RrLapplandTOTPError;
                    stateKey = "mfa-totp-error";
                  } else {
                    ActiveComponent = RrLapplandTOTP;
                    stateKey = "mfa-totp";
                  }
                } else if (activeMfaMethod === "email") {
                  if (isEmailError) {
                    ActiveComponent = RrLapplandEmailError;
                    stateKey = "mfa-email-error";
                  } else {
                    ActiveComponent = RrLapplandEmail;
                    stateKey = "mfa-email";
                  }
                } else {
                  if (isBackupError) {
                    ActiveComponent = RrLapplandBackupCodeError;
                    stateKey = "mfa-backup-error";
                  } else {
                    ActiveComponent = RrLapplandBackupCode;
                    stateKey = "mfa-backup";
                  }
                }
              } else if (isIdentifierError) {
                ActiveComponent = RrLapplandUserNotFound;
                stateKey = "login-user-not-found";
              } else if (isPasswordError) {
                ActiveComponent = RrLapplandWrongPassword;
                stateKey = "login-wrong-password";
              } else if (
                hasError &&
                (message.toLowerCase().includes("passkey") ||
                  message.toLowerCase().includes("allowed") ||
                  message.toLowerCase().includes("cancelled") ||
                  message.toLowerCase().includes("denied"))
              ) {
                ActiveComponent = RrLapplandPasskeyDenied;
                stateKey = "login-passkey-denied";
              } else {
                ActiveComponent = RrLapplandWelcomeImage;
                stateKey = "login-welcome";
              }

              return (
                <AnimatePresence>
                  <motion.div
                    key={stateKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center scale-[1.1]"
                  >
                    <ActiveComponent className="w-full h-full object-cover object-[65%_50%] select-none pointer-events-none text-foreground" />
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Footer agreement terms */}
      <p className="px-6 text-center text-xs text-muted-foreground/80 max-w-xs mx-auto leading-normal">
        By clicking continue, you agree to our{" "}
        <Link
          href="/polaris/tos"
          className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/polaris/privacy"
          className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
