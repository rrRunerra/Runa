"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useRrDevice } from "@/hooks/useRrDevice";
import { useRrBrowser } from "@/hooks/useRrBrowser";
import { RrLoginForm } from "@/components/rrComponents/polaris/rrLoginForm";
import { toast } from "sonner";
import { RESERVED_KEYWORDS } from "@/lib/rrReservedKeywords";

export default function Page() {
  const deviceType = useRrDevice();
  const browserName = useRrBrowser();
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
  const [mfaMethods, setMfaMethods] = useState<
    Array<"totp" | "email" | "passkey" | "backup" | "device_notification">
  >([]);
  const [activeMfaMethod, setActiveMfaMethod] = useState<
    | "totp"
    | "email"
    | "passkey"
    | "backup"
    | "device_notification"
    | "recovery"
    | null
  >(null);
  const [tempToken, setTempToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [recoveryCodeSent, setRecoveryCodeSent] = useState(false);
  const [deviceCodeSent, setDeviceCodeSent] = useState(false);
  const [devices, setDevices] = useState<{ id: string; deviceName: string }[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Login Code States
  const [loginCodeState, setLoginCodeState] = useState<
    "none" | "generating" | "code" | "error"
  >("none");
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const pollingRef = React.useRef<NodeJS.Timeout | null>(null);

  // Background stars animation
  const [stars, setStars] = useState<
    {
      id: number;
      size: number;
      x: number;
      y: number;
      duration: number;
      delay: number;
    }[]
  >([]);

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

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);
  const handleRedirect = () => {
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    );
    let safeRedirect = "/polaris";
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
      const {
        generateKeyPair,
        exportPublicKey,
        generateMlKemKeyPair,
        bufferToBase64Url,
      } = await import("@runa/crypto/browser");
      const { saveKey } = await import("@/lib/indexeddb");

      // Generate Identity Key
      const identityKeys = await generateKeyPair();
      const identityPublicKey = await exportPublicKey(identityKeys.publicKey);

      // Generate ML-KEM Identity Key
      const mlKemIdentityKeys = await generateMlKemKeyPair();
      const mlKemIdentityPublicKey = bufferToBase64Url(
        mlKemIdentityKeys.publicKey.buffer.slice(
          mlKemIdentityKeys.publicKey.byteOffset,
          mlKemIdentityKeys.publicKey.byteOffset +
            mlKemIdentityKeys.publicKey.byteLength,
        ) as ArrayBuffer,
      );

      // Generate Signed PreKey
      const signedPreKeys = await generateKeyPair();
      const signedPrePublicKey = await exportPublicKey(signedPreKeys.publicKey);

      // Generate 5 One-time PreKeys
      const preKeysPublic: string[] = [];
      const preKeysPrivateMap: Record<string, CryptoKey> = {};
      for (let i = 0; i < 5; i++) {
        const preKeys = await generateKeyPair();
        const preKeyPublic = await exportPublicKey(preKeys.publicKey);
        preKeysPublic.push(preKeyPublic);

        preKeysPrivateMap[preKeyPublic] = preKeys.privateKey;
      }

      const userAgent = navigator.userAgent;
      const deviceName = `${deviceType} (${browserName})`;

      // Call register API
      const registerRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/devices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            deviceName,
            userAgent,
            identityKey: identityPublicKey,
            mlKemIdentityKey: mlKemIdentityPublicKey,
            signedPreKey: signedPrePublicKey,
            preKeys: preKeysPublic,
          }),
        },
      );

      if (!registerRes.ok) {
        throw new Error("Failed to register device on server");
      }

      const deviceData = await registerRes.json();

      // Save device ID to localStorage (safe)
      localStorage.setItem("runa_device_id", deviceData.id);

      // Save private keys to IndexedDB (secure, non-extractable)
      await saveKey(
        `polaris_identity_key_${deviceData.id}`,
        identityKeys.privateKey,
      );
      await saveKey(
        `polaris_mlkem_identity_key_${deviceData.id}`,
        mlKemIdentityKeys.secretKey,
      );
      await saveKey(
        `polaris_signed_prekey_${deviceData.id}`,
        signedPreKeys.privateKey,
      );
      await saveKey(`polaris_prekeys_${deviceData.id}`, preKeysPrivateMap);
    } catch (err) {
      console.error("Device registration failed:", err);
    }
  };

  const initializeEncryptionKeysOnLogin = async (
    accessToken: string,
    username: string,
    password: string,
  ): Promise<void> => {
    try {
      const {
        deriveMasterKey,
        generateKeyPair,
        exportPublicKey,
        encryptData,
        decryptData,
        generateMlKemKeyPair,
        bufferToBase64Url,
        base64UrlToBuffer,
      } = await import("@runa/crypto/browser");
      const { saveKey } = await import("@/lib/indexeddb");

      // 1. Fetch Encryption keys status from server
      const getRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!getRes.ok) throw new Error("Failed to check encryption keys status");
      const encryptionKeys = await getRes.json();

      const masterKey = await deriveMasterKey(password, username);
      let importedPrivateKey: CryptoKey;
      let importedMlKemPrivateKey: Uint8Array | null = null;

      if (!encryptionKeys.userPublicKey) {
        // Create user keypair (ECDH)
        const userKeyPair = await generateKeyPair();
        const userPublicKeyBase64 = await exportPublicKey(
          userKeyPair.publicKey,
        );

        // Export private key as JWK string
        const userPrivateKeyJwk = await window.crypto.subtle.exportKey(
          "jwk",
          userKeyPair.privateKey,
        );

        // Create user keypair (ML-KEM)
        const mlKemKeyPair = await generateMlKemKeyPair();
        const userMlKemPublicKeyBase64 = bufferToBase64Url(
          mlKemKeyPair.publicKey.buffer.slice(
            mlKemKeyPair.publicKey.byteOffset,
            mlKemKeyPair.publicKey.byteOffset +
              mlKemKeyPair.publicKey.byteLength,
          ) as ArrayBuffer,
        );

        const userMlKemPrivateKeyBase64 = bufferToBase64Url(
          mlKemKeyPair.secretKey.buffer.slice(
            mlKemKeyPair.secretKey.byteOffset,
            mlKemKeyPair.secretKey.byteOffset +
              mlKemKeyPair.secretKey.byteLength,
          ) as ArrayBuffer,
        );

        // Package both private keys together
        const keysPackage = {
          ecdhJwk: userPrivateKeyJwk,
          mlkemSecretKey: userMlKemPrivateKeyBase64,
        };

        // Encrypt private keys package using masterKey
        const encryptedPrivate = await encryptData(
          JSON.stringify(keysPackage),
          masterKey,
        );

        // Upload to server
        const putRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              userPublicKey: userPublicKeyBase64,
              userMlKemPublicKey: userMlKemPublicKeyBase64,
              encryptedUserPrivateKey: JSON.stringify(encryptedPrivate),
            }),
          },
        );
        if (!putRes.ok)
          throw new Error("Failed to store encryption keys on server");

        importedPrivateKey = await window.crypto.subtle.importKey(
          "jwk",
          userPrivateKeyJwk,
          { name: "ECDH", namedCurve: "P-256" },
          false,
          ["deriveKey", "deriveBits"],
        );
        importedMlKemPrivateKey = mlKemKeyPair.secretKey;
      } else if (encryptionKeys.encryptedUserPrivateKey) {
        // Decrypt existing user private keys using masterKey
        const encryptedPrivate = JSON.parse(
          encryptionKeys.encryptedUserPrivateKey,
        );
        const privateKeysStr = await decryptData(
          encryptedPrivate.ciphertext,
          encryptedPrivate.iv,
          masterKey,
        );

        const keysPackage = JSON.parse(privateKeysStr);
        let ecdhJwk: any;
        let mlkemSecretKeyBase64: string | null = null;

        if (
          keysPackage &&
          typeof keysPackage === "object" &&
          "ecdhJwk" in keysPackage
        ) {
          ecdhJwk = keysPackage.ecdhJwk;
          mlkemSecretKeyBase64 = keysPackage.mlkemSecretKey || null;
        } else {
          ecdhJwk = keysPackage; // Plain JWK
        }

        importedPrivateKey = await window.crypto.subtle.importKey(
          "jwk",
          ecdhJwk,
          { name: "ECDH", namedCurve: "P-256" },
          false,
          ["deriveKey", "deriveBits"],
        );

        if (mlkemSecretKeyBase64) {
          importedMlKemPrivateKey = new Uint8Array(
            base64UrlToBuffer(mlkemSecretKeyBase64),
          );
        } else {
          // Upgrade on the fly: generate ML-KEM keys
          const mlKemKeyPair = await generateMlKemKeyPair();
          const userMlKemPublicKeyBase64 = bufferToBase64Url(
            mlKemKeyPair.publicKey.buffer.slice(
              mlKemKeyPair.publicKey.byteOffset,
              mlKemKeyPair.publicKey.byteOffset +
                mlKemKeyPair.publicKey.byteLength,
            ) as ArrayBuffer,
          );
          importedMlKemPrivateKey = mlKemKeyPair.secretKey;

          const newMlKemPrivateKeyBase64 = bufferToBase64Url(
            mlKemKeyPair.secretKey.buffer.slice(
              mlKemKeyPair.secretKey.byteOffset,
              mlKemKeyPair.secretKey.byteOffset +
                mlKemKeyPair.secretKey.byteLength,
            ) as ArrayBuffer,
          );

          // Package both together
          const newKeysPackage = {
            ecdhJwk,
            mlkemSecretKey: newMlKemPrivateKeyBase64,
          };

          // Re-encrypt package
          const newEncryptedPrivate = await encryptData(
            JSON.stringify(newKeysPackage),
            masterKey,
          );

          // Update server on the fly
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                userPublicKey: encryptionKeys.userPublicKey,
                userMlKemPublicKey: userMlKemPublicKeyBase64,
                encryptedUserPrivateKey: JSON.stringify(newEncryptedPrivate),
              }),
            },
          );
        }
      } else {
        return;
      }

      await saveKey(`private_key_${username}`, importedPrivateKey);
      await saveKey(`mlkem_key_${username}`, importedMlKemPrivateKey);

      // Re-read keys from server to make sure we have final values
      const finalRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (finalRes.ok) {
        const d = await finalRes.json();
        if (d.userPublicKey) {
          await saveKey(`public_key_string_${username}`, d.userPublicKey);
        }
        if (d.userMlKemPublicKey) {
          await saveKey(
            `mlkem_public_key_string_${username}`,
            d.userMlKemPublicKey,
          );
        }
      }

      window.dispatchEvent(new CustomEvent("runa-encryption-unlocked"));
    } catch (err) {
      console.error("Encryption keys initialization failed:", err);
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
      const loginCheckRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: lower, password }),
        },
      );

      const loginCheckData = await loginCheckRes.json();

      if (!loginCheckRes.ok) {
        throw new Error(loginCheckData.message || "Invalid credentials.");
      }

      // 2. If MFA is active, transition UI inline
      if (loginCheckData.mfaRequired) {
        setTempToken(loginCheckData.tempToken);

        const currentDeviceId = localStorage.getItem("runa_device_id");
        const availableDevices = (loginCheckData.devices || []).filter(
          (d: any) => d.id !== currentDeviceId,
        );

        let methods = loginCheckData.allowedMethods;
        if (availableDevices.length === 0) {
          methods = methods.filter((m: string) => m !== "device_notification");
        }

        setMfaMethods(
          methods as Array<
            "totp" | "email" | "passkey" | "backup" | "device_notification"
          >,
        );
        setDevices(availableDevices);
        setMfaRequired(true);

        // Pick priority method: Passkey -> Device Notification -> TOTP -> Email -> Backup (per user instructions)
        if (methods.includes("passkey")) {
          setActiveMfaMethod("passkey");
          triggerPasskeyMfa(loginCheckData.tempToken);
        } else if (
          methods.includes("device_notification") &&
          availableDevices.length > 0
        ) {
          setActiveMfaMethod("device_notification");
          // Don't auto-send, let them pick a device first.
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
        console.error("[Login] direct signIn credentials error:", res.error);
        throw new Error(`Credentials login failed: ${res.error}`);
      } else if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.accessToken) {
            await registerDeviceOnLogin(sessionData.accessToken);
            await initializeEncryptionKeysOnLogin(
              sessionData.accessToken,
              sessionData.user?.username ?? lower,
              password,
            );
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/send-email-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempToken: token }),
        },
      );
      if (res.ok) {
        setEmailCodeSent(true);
        setMessage("✉️ Verification code sent to your email.");
      } else {
        const data = await res.json();
        setMessage(
          `❌ ${data.message || "Failed to send email verification."}`,
        );
      }
    } catch {
      setMessage("❌ Failed to contact mail server.");
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryOtp = async (token: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/send-recovery-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempToken: token }),
        },
      );
      if (res.ok) {
        setRecoveryCodeSent(true);
        setActiveMfaMethod("recovery");
        setMessage("✉️ Account recovery code sent to your email.");
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.message || "Failed to send recovery email."}`);
      }
    } catch {
      setMessage("❌ Failed to contact mail server.");
    } finally {
      setLoading(false);
    }
  };

  const sendDeviceNotification = async (token: string, deviceId: string) => {
    if (!deviceId) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/device/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempToken: token, deviceId }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setDeviceCodeSent(true);
        setMessage("✅ Notification sent to your device.");
      } else {
        setMessage(
          `❌ ${data.message || "Failed to send device notification."}`,
        );
      }
    } catch {
      setMessage("❌ Failed to contact server.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger browser WebAuthn Passkey prompt for 2FA
  const triggerPasskeyMfa = async (token: string) => {
    setLoading(true);
    setMessage("");
    try {
      const optionsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/passkey/login-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim().toLowerCase() }),
        },
      );
      if (!optionsRes.ok)
        throw new Error("Failed to load passkey login options");
      const { options } = await optionsRes.json();

      const assertion = await startAuthentication({
        optionsJSON: options,
      });

      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tempToken: token,
            method: "passkey",
            passkeyResponse: assertion,
          }),
        },
      );

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok)
        throw new Error(verifyData.message || "Passkey validation failed");

      await completeLoginWithSuccessToken(verifyData.mfaSuccessToken);
    } catch (err: any) {
      console.error(err);
      const isDenied =
        err.name === "NotAllowedError" ||
        err.message?.includes("NotAllowedError") ||
        err.message?.includes("not allowed");
      setMessage(
        isDenied
          ? "❌ Passkey request was cancelled or denied."
          : `❌ Passkey verification failed: ${err.message || "Cancelled"}`,
      );
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
      const verifyRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/mfa/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tempToken,
            method: activeMfaMethod,
            code: mfaCode,
          }),
        },
      );

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok)
        throw new Error(verifyData.message || "Invalid verification code.");

      await completeLoginWithSuccessToken(verifyData.mfaSuccessToken);
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Verification failed"}`);
      setLoading(false);
    }
  };

  const completeLoginWithSuccessToken = async (
    successToken: string,
  ): Promise<void> => {
    const res = await signIn("credentials", {
      redirect: false,
      identifier: identifier.trim().toLowerCase(),
      mfaSuccessToken: successToken,
    });

    if (res?.error) {
      console.error(
        "[Login] MFA completeLoginWithSuccessToken signIn credentials error:",
        res.error,
      );
      setMessage(`❌ Session establishment failed: ${res.error}`);
      setLoading(false);
    } else if (res?.ok) {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData?.accessToken) {
          await registerDeviceOnLogin(sessionData.accessToken);

          await initializeEncryptionKeysOnLogin(
            sessionData.accessToken,
            sessionData.user?.username ?? identifier.trim().toLowerCase(),
            password,
          );
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
      const optionsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/passkey/login-options`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: val
            ? JSON.stringify({ identifier: val.toLowerCase() })
            : JSON.stringify({}),
        },
      );
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
        console.error("[Login] Passkey signIn credentials error:", res.error);
        setMessage(`❌ Passkey login failed: ${res.error}`);
      } else if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData?.accessToken) {
            await registerDeviceOnLogin(sessionData.accessToken);
          }
        }
        toast.info("Encryption locked", {
          description:
            "Passkey can't unlock encryption by itself. Open user menu at the bottom left, then click on Encryption.",
          duration: 8000,
        });
        handleRedirect();
      }
    } catch (err: any) {
      console.error(err);
      const isDenied =
        err.name === "NotAllowedError" ||
        err.message?.includes("NotAllowedError") ||
        err.message?.includes("not allowed");
      setMessage(
        isDenied
          ? "❌ Passkey request was cancelled or denied."
          : `❌ Passkey login cancelled or failed.`,
      );
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
    } else if (method === "recovery") {
      sendRecoveryOtp(tempToken);
    }
  };

  const handleGenerateLoginCode = async () => {
    setLoginCodeState("generating");
    setMessage("");

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login-code/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await res.json();
      setGeneratedCode(data.code);
      setLoginCodeState("code");

      startPollingLoginCode(data.code);
    } catch (err) {
      console.error(err);
      setLoginCodeState("error");
    }
  };

  const handleCancelLoginCode = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setLoginCodeState("none");
    setGeneratedCode("");
  };

  const startPollingLoginCode = (code: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/login-code/status?code=${code}`,
        );
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "APPROVED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          await completeLoginWithCode(code);
        } else if (data.status === "EXPIRED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setLoginCodeState("error");
          setMessage("❌ Link code expired. Please generate a new one.");
        }
      } catch (err) {
        console.error("Polling login code status failed:", err);
      }
    }, 3000);
  };

  const completeLoginWithCode = async (code: string) => {
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        isLoginCode: "true",
        loginCode: code,
      });

      if (res?.error) {
        throw new Error(`Login failed: ${res.error}`);
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
      setMessage(`❌ ${err.message || "Failed to log in with code."}`);
      setLoginCodeState("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-950 p-6 md:p-10">
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl">
        <RrLoginForm
          identifier={identifier}
          setIdentifier={setIdentifier}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loading={loading}
          message={message}
          setMessage={setMessage}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          onSubmit={handleSubmit}
          onPasskeyLogin={handlePasskeyLoginDirect}
          onGenerateLoginCode={handleGenerateLoginCode}
          onCancelLoginCode={handleCancelLoginCode}
          loginCodeState={loginCodeState}
          generatedCode={generatedCode}
          mfaRequired={mfaRequired}
          setMfaRequired={setMfaRequired}
          activeMfaMethod={activeMfaMethod}
          setActiveMfaMethod={setActiveMfaMethod}
          mfaMethods={mfaMethods}
          mfaCode={mfaCode}
          setMfaCode={setMfaCode}
          onVerifyMfa={handleVerifyMfaCode}
          onSelectMfaMethod={selectMfaMethod}
          tempToken={tempToken}
          sendEmailOtp={sendEmailOtp}
          emailCodeSent={emailCodeSent}
          sendRecoveryOtp={sendRecoveryOtp}
          recoveryCodeSent={recoveryCodeSent}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          sendDeviceNotification={sendDeviceNotification}
          deviceCodeSent={deviceCodeSent}
        />
      </div>
    </div>
  );
}
