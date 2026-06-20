"use client";

import React, { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Compass, Fingerprint, ArrowLeft, Smartphone, Key } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const RESERVED_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "null", "return", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "package", "private", "protected", "public", "static",
  "any", "boolean", "constructor", "declare", "get", "module",
  "require", "number", "set", "string", "symbol", "type", "undefined",
  "unknown", "never", "readonly", "keyof", "infer", "as", "from",
  "of", "namespace", "interface", "implements", "enum", "await",
  "select", "insert", "update", "drop", "truncate", "alter",
  "create", "table", "database", "index", "use", "where", "join",
  "left", "right", "inner", "outer", "on", "and", "or", "not",
  "union", "values", "into", "order", "by", "group", "having",
  "limit", "offset", "distinct", "all", "exists", "like", "between", "is"
]);

export default function Page() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
  } | null>(null);
  const router = useRouter();

  // MFA Flow States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaMethods, setMfaMethods] = useState<string[]>([]);
  const [activeMfaMethod, setActiveMfaMethod] = useState<"totp" | "email" | "passkey" | "backup" | null>(null);
  const [tempToken, setTempToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  // Background stars animation
  const [stars, setStars] = useState<{ id: number; size: number; x: number; y: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    document.title = "Polaris > Login";

    const generatedStars = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    }));
    setStars(generatedStars);
  }, []);
  const handleRedirect = () => {
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    let safeRedirect = "/polaris/dash";
    if (callbackUrl) {
      if (callbackUrl.startsWith("/")) {
        safeRedirect = callbackUrl;
      } else {
        try {
          const url = new URL(callbackUrl);
          const allowedOrigin = window.location.origin;
          if (url.origin === allowedOrigin) {
            safeRedirect = callbackUrl;
          }
        } catch (e) {
          throw new Error("Invalid callback URL");
        }
      }
    }
    router.push(safeRedirect);
  };

  const registerDeviceOnLogin = async (accessToken: string): Promise<void> => {
    const existingDeviceId = localStorage.getItem("runa_device_id");
    if (existingDeviceId) return;

    try {
      const { generateKeyPair, exportPublicKey } = await import("@/lib/crypto");

      // Generate Identity Key
      const identityKeys = await generateKeyPair();
      const identityPublicKey = await exportPublicKey(identityKeys.publicKey);
      const identityPrivateKeyJwk = await window.crypto.subtle.exportKey("jwk", identityKeys.privateKey);

      // Generate Signed PreKey
      const signedPreKeys = await generateKeyPair();
      const signedPrePublicKey = await exportPublicKey(signedPreKeys.publicKey);
      const signedPrePrivateKeyJwk = await window.crypto.subtle.exportKey("jwk", signedPreKeys.privateKey);

      // Generate 5 One-time PreKeys
      const preKeysPublic: string[] = [];
      const preKeysPrivateJwks: Record<string, unknown> = {};
      for (let i = 0; i < 5; i++) {
        const preKeys = await generateKeyPair();
        const preKeyPublic = await exportPublicKey(preKeys.publicKey);
        preKeysPublic.push(preKeyPublic);
        
        const preKeyPrivateJwk = await window.crypto.subtle.exportKey("jwk", preKeys.privateKey);
        preKeysPrivateJwks[preKeyPublic] = preKeyPrivateJwk;
      }

      // Deduce device name
      const userAgent = navigator.userAgent;
      let deviceType = "Unknown Device";
      if (/Windows/i.test(userAgent)) deviceType = "Windows Device";
      else if (/Macintosh|Mac OS/i.test(userAgent)) deviceType = "Mac Device";
      else if (/Linux/i.test(userAgent)) deviceType = "Linux Device";
      else if (/Android/i.test(userAgent)) deviceType = "Android Device";
      else if (/iPhone|iPad|iPod/i.test(userAgent)) deviceType = "iOS Device";

      let browserName = "Browser";
      if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) browserName = "Chrome";
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browserName = "Safari";
      else if (/Firefox/i.test(userAgent)) browserName = "Firefox";
      else if (/Edge|Edg/i.test(userAgent)) browserName = "Edge";

      const deviceName = `${deviceType} (${browserName})`;

      // Call register API
      const registerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/device/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceName,
          userAgent,
          identityKey: identityPublicKey,
          signedPreKey: signedPrePublicKey,
          preKeys: preKeysPublic,
        }),
      });

      if (!registerRes.ok) {
        throw new Error("Failed to register device on server");
      }

      const deviceData = await registerRes.json();
      
      // Save to localStorage
      localStorage.setItem("runa_device_id", deviceData.id);
      localStorage.setItem("runa_identity_private_key", JSON.stringify(identityPrivateKeyJwk));
      localStorage.setItem("runa_signed_prekey_private_key", JSON.stringify(signedPrePrivateKeyJwk));
      localStorage.setItem("runa_prekeys_private_keys", JSON.stringify(preKeysPrivateJwks));
    } catch (err) {
      console.error("Device registration failed:", err);
    }
  };

  const initializeE2eeKeysOnLogin = async (accessToken: string, username: string, password: string): Promise<void> => {
    try {
      const { deriveMasterKey, generateKeyPair, exportPublicKey, encryptData, decryptData } = await import("@/lib/crypto");

      // 1. Fetch E2EE keys status from server
      const getRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!getRes.ok) throw new Error("Failed to check E2EE keys status");
      const e2eKeys = await getRes.json();

      const masterKey = await deriveMasterKey(password, username);

      if (!e2eKeys.userPublicKey) {
        // Create user keypair
        const userKeyPair = await generateKeyPair();
        const userPublicKeyBase64 = await exportPublicKey(userKeyPair.publicKey);
        
        // Export private key as JWK string
        const userPrivateKeyJwk = await window.crypto.subtle.exportKey("jwk", userKeyPair.privateKey);
        const userPrivateKeyStr = JSON.stringify(userPrivateKeyJwk);

        // Encrypt private key string using masterKey
        const encryptedPrivate = await encryptData(userPrivateKeyStr, masterKey);

        // Upload to server
        const putRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userPublicKey: userPublicKeyBase64,
            encryptedUserPrivateKey: JSON.stringify(encryptedPrivate),
          }),
        });
        if (!putRes.ok) throw new Error("Failed to store E2EE keys on server");

        // Save decrypted private key in localStorage
        localStorage.setItem("runa_user_private_key", userPrivateKeyStr);
      } else if (e2eKeys.encryptedUserPrivateKey) {
        // Decrypt existing user private key using masterKey
        const encryptedPrivate = JSON.parse(e2eKeys.encryptedUserPrivateKey);
        const userPrivateKeyStr = await decryptData(
          encryptedPrivate.ciphertext,
          encryptedPrivate.iv,
          masterKey
        );

        // Save to localStorage
        localStorage.setItem("runa_user_private_key", userPrivateKeyStr);
      }
    } catch (err) {
      console.error("E2EE key initialization failed:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const val = identifier.trim();
    let sanitized = val;
    if (!val.includes("@")) {
      sanitized = val.replace(/[^a-zA-Z0-9_]/g, "");
    }
    const lower = sanitized.toLowerCase();

    if (!sanitized.includes("@") && RESERVED_KEYWORDS.has(lower)) {
      setFieldErrors((prev) => ({
        ...prev,
        identifier: `Username cannot be a reserved keyword ("${lower}")`,
      }));
      setLoading(false);
      return;
    }

    try {
      // 1. Direct credentials check at backend API to see if MFA is required
      const loginCheckRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: lower, password }),
      });

      const loginCheckData = await loginCheckRes.json();

      if (!loginCheckRes.ok) {
        throw new Error(loginCheckData.message || "Invalid credentials.");
      }

      // 2. If MFA is active, transition UI inline
      if (loginCheckData.mfaRequired) {
        setTempToken(loginCheckData.tempToken);
        setMfaMethods(loginCheckData.allowedMethods);
        setMfaRequired(true);

        // Pick priority method: Passkey -> TOTP -> Email -> Backup (per user instructions)
        const methods = loginCheckData.allowedMethods;
        if (methods.includes("passkey")) {
          setActiveMfaMethod("passkey");
          triggerPasskeyMfa(loginCheckData.tempToken);
        } else if (methods.includes("totp")) {
          setActiveMfaMethod("totp");
        } else if (methods.includes("email")) {
          setActiveMfaMethod("email");
          sendEmailOtp(loginCheckData.tempToken);
        } else if (methods.includes("backup")) {
          setActiveMfaMethod("backup");
        }
        setLoading(false);
        return;
      }

      // 3. No MFA active, complete direct sign-in via next-auth
      const res = await signIn("credentials", {
        redirect: false,
        identifier: lower,
        password,
      });

      if (res?.error) {
        throw new Error("Credentials login failed. Please try again.");
      } else if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.accessToken) {
            await registerDeviceOnLogin(sessionData.accessToken);
            await initializeE2eeKeysOnLogin(sessionData.accessToken, lower, password);
          }
        }
        handleRedirect();
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Invalid email/username or password."}`);
      setLoading(false);
    }
  };

  // Trigger Email OTP Code Delivery
  const sendEmailOtp = async (token: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/send-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken: token }),
      });
      if (res.ok) {
        setEmailCodeSent(true);
        setMessage("✉️ Verification code sent to your email.");
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.message || "Failed to send email verification."}`);
      }
    } catch {
      setMessage("❌ Failed to contact mail server.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger browser WebAuthn Passkey prompt for 2FA
  const triggerPasskeyMfa = async (token: string) => {
    setLoading(true);
    setMessage("");
    try {
      const optionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/passkey/login-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim().toLowerCase() }),
      });
      if (!optionsRes.ok) throw new Error("Failed to load passkey login options");
      const { options } = await optionsRes.json();

      const assertion = await startAuthentication({
        optionsJSON: options,
      });

      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken: token,
          method: "passkey",
          passkeyResponse: assertion,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || "Passkey validation failed");

      await completeLoginWithSuccessToken(verifyData.mfaSuccessToken);
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Passkey verification failed: ${err.message || "Cancelled"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle standard 2FA OTP codes validation
  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 5) return;
    setLoading(true);
    setMessage("");

    try {
      const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          method: activeMfaMethod,
          code: mfaCode,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || "Invalid verification code.");

      await completeLoginWithSuccessToken(verifyData.mfaSuccessToken);
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Verification failed"}`);
      setLoading(false);
    }
  };

  const completeLoginWithSuccessToken = async (successToken: string): Promise<void> => {
    const res = await signIn("credentials", {
      redirect: false,
      identifier: identifier.trim().toLowerCase(),
      mfaSuccessToken: successToken,
    });

    if (res?.error) {
      setMessage("❌ Session establishment failed.");
      setLoading(false);
    } else if (res?.ok) {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData?.accessToken) {
          await registerDeviceOnLogin(sessionData.accessToken);
          await initializeE2eeKeysOnLogin(sessionData.accessToken, identifier.trim().toLowerCase(), password);
        }
      }
      handleRedirect();
    }
  };

  // Direct Passwordless Login with Passkey
  const handlePasskeyLoginDirect = async () => {
    const val = identifier.trim();
    setLoading(true);
    setMessage("");
    try {
      const optionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/passkey/login-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: val ? JSON.stringify({ identifier: val.toLowerCase() }) : JSON.stringify({}),
      });
      if (!optionsRes.ok) {
        const errData = await optionsRes.json();
        throw new Error(errData.message || "No passkey registered.");
      }
      const { options } = await optionsRes.json();

      const assertion = await startAuthentication({
        optionsJSON: options,
      });

      const res = await signIn("credentials", {
        redirect: false,
        ...(val ? { identifier: val.toLowerCase() } : {}),
        isPasskeyOnly: "true",
        passkeyResponse: JSON.stringify(assertion),
      });

      if (res?.error) {
        setMessage("❌ Passkey login failed. Check credentials.");
      } else if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.accessToken) {
            await registerDeviceOnLogin(sessionData.accessToken);
          }
        }
        handleRedirect();
      }
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Passkey login cancelled or failed.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle switching active method in MFA card
  const selectMfaMethod = (method: any) => {
    setActiveMfaMethod(method);
    setMfaCode("");
    setMessage("");
    if (method === "passkey") {
      triggerPasskeyMfa(tempToken);
    } else if (method === "email" && !emailCodeSent) {
      sendEmailOtp(tempToken);
    }
  };

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden font-sans bg-black select-none">
      {/* ── Background Starry Sky ────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full opacity-35"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [0.15, 0.75, 0.15],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-60" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[550px] h-[550px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
      </div>

      {/* ── Main Auth Card ──────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.6)]">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-radial from-primary/5 via-transparent to-transparent pointer-events-none z-0" />

          {/* Header Info Block */}
          <div className="relative z-10 flex flex-col items-center text-center gap-1.5 mb-8">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Compass className="w-3.5 h-3.5 text-primary animate-spin-slow" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-primary uppercase">
                POLARIS
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mfaRequired ? "MFA Verification" : "Welcome Back"}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {!mfaRequired ? (
              // ── Step 1: Credentials Form ──
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="relative z-10 flex flex-col gap-6"
              >
                <div className="grid gap-2">
                  <Label
                    htmlFor="identifier"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 ml-1"
                  >
                    {fieldErrors?.identifier ? (
                      <span className="text-red-400 font-bold">{fieldErrors.identifier}</span>
                    ) : (
                      "Email or Username"
                    )}
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="example@runerra.org"
                      required
                      value={identifier}
                      onChange={(e) => {
                        const val = e.target.value;
                        let sanitized = val;
                        if (!val.includes("@")) {
                          sanitized = val.replace(/[^a-zA-Z0-9_]/g, "");
                        }
                        setIdentifier(sanitized);

                        const lower = sanitized.toLowerCase();
                        if (!sanitized.includes("@") && RESERVED_KEYWORDS.has(lower)) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            identifier: `Username cannot be a reserved keyword ("${lower}")`,
                          }));
                        } else {
                          setFieldErrors((prev) => ({
                            ...prev,
                            identifier: "",
                          }));
                        }
                      }}
                      disabled={loading}
                      className={cn(
                        "pl-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]",
                        fieldErrors?.identifier && "border-red-500/50 bg-red-500/5 focus:ring-red-500/30"
                      )}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label 
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
                    >
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={64}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-11 pr-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3.5 mt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                    disabled={loading || !!fieldErrors?.identifier}
                  >
                    {loading ? "Verifying..." : "Login"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasskeyLoginDirect}
                    className="w-full h-12 rounded-xl border border-zinc-800 hover:bg-zinc-900/60 font-semibold text-xs cursor-pointer text-zinc-300"
                    disabled={loading}
                  >
                    <Fingerprint className="size-4 mr-1.5 text-primary animate-pulse" />
                    Login with Passkey (Passwordless)
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "p-3.5 rounded-xl text-center text-xs font-semibold border tracking-wide",
                        message.includes("❌")
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                      )}
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-px bg-zinc-800/40 my-2" />

                <p className="text-center text-xs text-muted-foreground font-medium">
                  New explorer?{" "}
                  <Link
                    href="/polaris/register"
                    className="text-primary font-bold hover:underline hover:text-primary/90 transition-colors"
                  >
                    Create credentials
                  </Link>
                </p>
              </motion.form>
            ) : (
              // ── Step 2: MFA Verification Interface ──
              <motion.div
                key="mfa-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="relative z-10 flex flex-col gap-6"
              >
                {/* Active method input */}
                {activeMfaMethod === "passkey" && (
                  <div className="flex flex-col items-center gap-4 py-3 text-center">
                    <div className="size-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center animate-bounce-slow">
                      <Fingerprint className="size-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Passkey Prompt Active</h4>
                      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                        Your browser should request verification using biometrics or your security key.
                      </p>
                    </div>
                    <Button
                      onClick={() => triggerPasskeyMfa(tempToken)}
                      className="h-10 px-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
                      disabled={loading}
                    >
                      Retry Passkey Prompt
                    </Button>
                  </div>
                )}

                {activeMfaMethod === "totp" && (
                  <form onSubmit={handleVerifyMfaCode} className="space-y-4">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Smartphone className="size-6 text-indigo-400" />
                      <Label htmlFor="mfa-otp-code" className="text-xs font-bold text-foreground">Authenticator App Code</Label>
                      <p className="text-[10px] text-muted-foreground">Enter the 6-digit verification code from your auth app.</p>
                    </div>
                    <Input
                      id="mfa-otp-code"
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="h-12 bg-zinc-900 border-zinc-800 rounded-xl text-center font-bold tracking-widest text-lg font-mono"
                      autoFocus
                      disabled={loading}
                    />
                    <Button
                      type="submit"
                      disabled={mfaCode.length !== 6 || loading}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer shadow-md"
                    >
                      {loading ? "Verifying..." : "Verify Code"}
                    </Button>
                  </form>
                )}

                {activeMfaMethod === "email" && (
                  <form onSubmit={handleVerifyMfaCode} className="space-y-4">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Mail className="size-6 text-sky-400" />
                      <Label htmlFor="mfa-email-code" className="text-xs font-bold text-foreground">Email One-Time Code</Label>
                      <p className="text-[10px] text-muted-foreground">A 6-digit code has been sent to your primary email address.</p>
                    </div>
                    <Input
                      id="mfa-email-code"
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 123456"
                      className="h-12 bg-zinc-900 border-zinc-800 rounded-xl text-center font-bold tracking-widest text-lg font-mono"
                      autoFocus
                      disabled={loading}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => sendEmailOtp(tempToken)}
                        disabled={loading}
                        className="flex-1 h-11 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold text-zinc-300"
                      >
                        Resend Email
                      </Button>
                      <Button
                        type="submit"
                        disabled={mfaCode.length !== 6 || loading}
                        className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer shadow-md"
                      >
                        {loading ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </form>
                )}

                {activeMfaMethod === "backup" && (
                  <form onSubmit={handleVerifyMfaCode} className="space-y-4">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Key className="size-6 text-emerald-400 animate-pulse" />
                      <Label htmlFor="mfa-backup-code" className="text-xs font-bold text-foreground">Backup Recovery Code</Label>
                      <p className="text-[10px] text-muted-foreground">Enter one of your 10-character backup recovery codes.</p>
                    </div>
                    <Input
                      id="mfa-backup-code"
                      type="text"
                      maxLength={10}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                      placeholder="e.g. a1b2c3d4e5"
                      className="h-12 bg-zinc-900 border-zinc-800 rounded-xl text-center font-bold tracking-widest text-sm font-mono"
                      autoFocus
                      disabled={loading}
                    />
                    <Button
                      type="submit"
                      disabled={mfaCode.length !== 10 || loading}
                      className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer shadow-md"
                    >
                      {loading ? "Verifying..." : "Submit Recovery Code"}
                    </Button>
                  </form>
                )}

                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className={cn(
                        "p-3.5 rounded-xl text-center text-xs font-semibold border tracking-wide",
                        message.includes("❌")
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                      )}
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Switch Methods list */}
                {mfaMethods.length > 1 && (
                  <div className="space-y-2">
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
                            onClick={() => selectMfaMethod(m)}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[10px] font-semibold text-zinc-400 hover:text-white hover:border-primary/45 transition-colors cursor-pointer"
                          >
                            {m === "passkey" && "Passkey"}
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
                  onClick={() => {
                    setMfaRequired(false);
                    setMessage("");
                    setMfaCode("");
                  }}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mx-auto pt-2"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to credentials login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
