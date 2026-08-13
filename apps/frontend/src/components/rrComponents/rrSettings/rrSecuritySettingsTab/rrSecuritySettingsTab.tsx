"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import { Key, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RrPillNav } from "@/components/rrComponents/rrPillNav";
import { useTranslation } from "react-i18next";
import {
  RR_SECURITY_SUBTABS,
  RR_SETTINGS_LAYOUT_IDS,
  RR_SETTINGS_API_ENDPOINTS,
  RR_SETTINGS_STORAGE_KEYS,
  RR_SETTINGS_LIMITS,
  type RrSecuritySubTab,
} from "@/lib/constants";

// Sub-Tab Components
import { RrSecurityPasswordSubTab } from "./rrSecuritySettingsTabComponents/rrSecurityPasswordSubTab";
import { RrSecurityMfaSubTab } from "./rrSecuritySettingsTabComponents/rrSecurityMfaSubTab";
import { RrSecurityDevicesSubTab } from "./rrSecuritySettingsTabComponents/rrSecurityDevicesSubTab";

export interface RrSecuritySettingsTabProps {
  /** Callback to close the parent settings dialog */
  onOpenChange: (open: boolean) => void;
  /** Optional callback to render custom footer controls into parent settings dialog */
  setFooterContent?: (node: React.ReactNode | null) => void;
}

/**
 * Main container component for Security Settings.
 * Centralizes all security state, data fetching (SWR queries), and API mutation logic,
 * passing props down to subtab presentational components.
 */
export const RrSecuritySettingsTab = ({
  onOpenChange,
  setFooterContent,
}: RrSecuritySettingsTabProps): React.JSX.Element => {
  const { t } = useTranslation();
  const { data: session, update } = useSession();

  const [activeTab, setActiveTab] = useState<RrSecuritySubTab>(
    RR_SECURITY_SUBTABS.PASSWORD
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ----------------------------------------------------
  // 1. Password & Session Token Refresh Logic
  // ----------------------------------------------------
  const [refreshCountdown, setRefreshCountdown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);

  useEffect(() => {
    const lastRefresh = localStorage.getItem(
      RR_SETTINGS_STORAGE_KEYS.LAST_TOKEN_REFRESH
    );
    if (lastRefresh) {
      const parsedTime = parseInt(lastRefresh, 10);
      setLastRefreshTime(parsedTime);
      const elapsed = Date.now() - parsedTime;
      const remaining = Math.max(
        0,
        RR_SETTINGS_LIMITS.TOKEN_REFRESH_COOLDOWN_SECONDS -
          Math.floor(elapsed / 1000)
      );
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
      localStorage.setItem(
        RR_SETTINGS_STORAGE_KEYS.LAST_TOKEN_REFRESH,
        now.toString()
      );
      setLastRefreshTime(now);
      setRefreshCountdown(RR_SETTINGS_LIMITS.TOKEN_REFRESH_COOLDOWN_SECONDS);
      toast.success(t("securitySettings.tokenRefreshedSuccess"));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("securitySettings.tokenRefreshFailed");
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  const apiMutate = useCallback(
    async (url: string, method: string = "POST", body?: any): Promise<any> => {
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
          errJson?.message || `Request failed with status ${res.status}`
        );
      }
      return res.json().catch(() => null);
    },
    [session?.accessToken]
  );

  const handleChangePassword = async (
    current: string,
    newPass: string
  ): Promise<void> => {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.USER_ME}`,
        "PUT",
        { currentPassword: current, newPassword: newPass }
      );
      toast.success(t("securitySettings.passwordChangedSuccess"));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.passwordChangeFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // 2. MFA & Passkey Data & Actions
  // ----------------------------------------------------
  const [isTotpSetupOpen, setIsTotpSetupOpen] = useState<boolean>(false);
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [totpQrUrl, setTotpQrUrl] = useState<string>("");
  const [totpCode, setTotpCode] = useState<string>("");

  const [isEmailSetupOpen, setIsEmailSetupOpen] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");

  const [isPasskeyRegisterOpen, setIsPasskeyRegisterOpen] = useState<boolean>(false);
  const [passkeyNickname, setPasskeyNickname] = useState<string>("");

  const [showCodesDialog, setShowCodesDialog] = useState<boolean>(false);
  const [displayedBackupCodes, setDisplayedBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);

  const [isConfirmDisableOpen, setIsConfirmDisableOpen] = useState<boolean>(false);
  const [disableMethod, setDisableMethod] = useState<
    "totp" | "email" | "passkey" | "all" | null
  >(null);
  const [disablePasskeyId, setDisablePasskeyId] = useState<string | null>(null);

  const [isConfirmRegenerateOpen, setIsConfirmRegenerateOpen] = useState<boolean>(false);

  const { data: mfaStatusData, mutate: refetchMfaSettings } = useSWR<any>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_STATUS}`,
          session.accessToken,
        ]
      : null,
    fetcher
  );

  const { data: passkeysData, mutate: refetchPasskeys } = useSWR<any[]>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_PASSKEYS}`,
          session.accessToken,
        ]
      : null,
    fetcher
  );

  const refetchAllMfa = useCallback((): void => {
    refetchMfaSettings();
    refetchPasskeys();
  }, [refetchMfaSettings, refetchPasskeys]);

  const handleInitiateTotpSetup = async (): Promise<void> => {
    try {
      const data = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_TOTP_SETUP}`,
        "POST"
      );
      setTotpSecret(data.secret);
      setTotpQrUrl(data.otpauthUrl);
      setIsTotpSetupOpen(true);
      setTotpCode("");
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.totpInitFailed"));
    }
  };

  const handleConfirmEnableTotp = async (): Promise<void> => {
    if (!totpCode || totpCode.length !== RR_SETTINGS_LIMITS.OTP_CODE_LENGTH) {
      toast.error(t("securitySettings.enterSixDigitCode"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_TOTP_ENABLE}`,
        "POST",
        { secret: totpSecret, token: totpCode }
      );
      toast.success(t("securitySettings.totpEnabledSuccess"));
      setIsTotpSetupOpen(false);
      refetchAllMfa();
      if (res.backupCodes?.length) {
        setDisplayedBackupCodes(res.backupCodes);
        setShowCodesDialog(true);
      }
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.totpEnableFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateEmailMfa = async (): Promise<void> => {
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_EMAIL_SEND_OTP}`,
        "POST"
      );
      setIsEmailSetupOpen(true);
      setEmailOtpCode("");
      toast.success(t("securitySettings.otpSentToEmail"));
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.emailOtpSendFailed"));
    }
  };

  const handleConfirmEnableEmailMfa = async (): Promise<void> => {
    if (!emailOtpCode || emailOtpCode.length !== RR_SETTINGS_LIMITS.OTP_CODE_LENGTH) {
      toast.error(t("securitySettings.enterSixDigitCode"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_EMAIL_ENABLE}`,
        "POST",
        { code: emailOtpCode }
      );
      toast.success(t("securitySettings.emailMfaEnabledSuccess"));
      setIsEmailSetupOpen(false);
      refetchAllMfa();
      if (res.backupCodes?.length) {
        setDisplayedBackupCodes(res.backupCodes);
        setShowCodesDialog(true);
      }
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.emailMfaEnableFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterPasskey = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const options = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_PASSKEY_REGISTER_OPTIONS}`,
        "POST"
      );
      const attResp = await startRegistration({ optionsJSON: options });
      const verifyRes = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_PASSKEY_REGISTER_VERIFY}`,
        "POST",
        { response: attResp, name: passkeyNickname.trim() || undefined }
      );

      toast.success(t("securitySettings.passkeyRegisteredSuccess"));
      setIsPasskeyRegisterOpen(false);
      setPasskeyNickname("");
      refetchAllMfa();
      if (verifyRes.backupCodes?.length) {
        setDisplayedBackupCodes(verifyRes.backupCodes);
        setShowCodesDialog(true);
      }
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.passkeyRegisterFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBackupCodes = async (): Promise<void> => {
    if (!displayedBackupCodes.length) return;
    await navigator.clipboard.writeText(displayedBackupCodes.join("\n"));
    setCopiedCodes(true);
    toast.success(t("securitySettings.backupCodesCopied"));
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleConfirmRegenerateBackupCodes = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_BACKUP_CODES_REGENERATE}`,
        "POST"
      );
      toast.success(t("securitySettings.backupCodesRegeneratedSuccess"));
      setIsConfirmRegenerateOpen(false);
      refetchAllMfa();
      if (res.backupCodes?.length) {
        setDisplayedBackupCodes(res.backupCodes);
        setShowCodesDialog(true);
      }
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.regenerateFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateDisableMfa = (
    method: "totp" | "email" | "passkey" | "all",
    passkeyId?: string
  ): void => {
    setDisableMethod(method);
    setDisablePasskeyId(passkeyId || null);
    setIsConfirmDisableOpen(true);
  };

  const handleConfirmDisableMfa = async (): Promise<void> => {
    if (!disableMethod) return;
    setIsSubmitting(true);
    try {
      if (disableMethod === "totp") {
        await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_TOTP_DISABLE}`,
          "POST"
        );
        toast.success(t("securitySettings.totpDisabledSuccess"));
      } else if (disableMethod === "email") {
        await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_EMAIL_DISABLE}`,
          "POST"
        );
        toast.success(t("securitySettings.emailMfaDisabledSuccess"));
      } else if (disableMethod === "passkey" && disablePasskeyId) {
        await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_PASSKEY_BY_ID(
            disablePasskeyId
          )}`,
          "DELETE"
        );
        toast.success(t("securitySettings.passkeyRemovedSuccess"));
      } else if (disableMethod === "all") {
        await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.MFA_DISABLE_ALL}`,
          "POST"
        );
        toast.success(t("securitySettings.allMfaDisabledSuccess"));
      }
      setIsConfirmDisableOpen(false);
      setDisableMethod(null);
      setDisablePasskeyId(null);
      refetchAllMfa();
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.disableMfaFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // 3. Linked Security Devices Data & Actions
  // ----------------------------------------------------
  const [linkCodeInput, setLinkCodeInput] = useState<string>("");
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [revokeDeviceId, setRevokeDeviceId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const { data: devicesData, mutate: refetchDevices } = useSWR<any[]>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.DEVICES}`,
          session.accessToken,
        ]
      : null,
    fetcher
  );

  const devices = Array.isArray(devicesData) ? devicesData : [];

  const handleLinkDevice = async (): Promise<void> => {
    const code = linkCodeInput.replace(/[\s-]/g, "").trim();
    if (code.length !== RR_SETTINGS_LIMITS.LINK_CODE_LENGTH) {
      toast.error(t("securitySettings.invalidLinkCode"));
      return;
    }

    setIsLinking(true);
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.DEVICE_LINK}`,
        "POST",
        { code }
      );
      toast.success(t("securitySettings.deviceLinkedSuccess"));
      setLinkCodeInput("");
      refetchDevices();
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.linkDeviceFailed"));
    } finally {
      setIsLinking(false);
    }
  };

  const handleRevokeDevice = async (id: string): Promise<void> => {
    setIsRevoking(true);
    try {
      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.DEVICE_BY_ID(
          id
        )}`,
        "DELETE"
      );
      toast.success(t("securitySettings.deviceRevokedSuccess"));
      setRevokeDeviceId(null);
      refetchDevices();
    } catch (err: any) {
      toast.error(err.message || t("securitySettings.revokeDeviceFailed"));
    } finally {
      setIsRevoking(false);
    }
  };

  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-end w-full gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm cursor-pointer px-3 sm:px-4"
        >
          {t("cancel")}
        </Button>
      </div>
    );

    return () => {
      setFooterContent(null);
    };
  }, [setFooterContent, onOpenChange, t]);

  const SECURITY_NAV_ITEMS = [
    {
      id: RR_SECURITY_SUBTABS.PASSWORD,
      label: t("securitySettings.subTabs.password", "Password & Session"),
      icon: Key,
    },
    {
      id: RR_SECURITY_SUBTABS.MFA,
      label: t("securitySettings.subTabs.mfa", "Two-Factor Auth"),
      icon: ShieldCheck,
    },
    {
      id: RR_SECURITY_SUBTABS.DEVICES,
      label: t("securitySettings.subTabs.devices", "Connected Devices"),
      icon: Smartphone,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-2 h-full min-h-0 flex-1">
      {/* Sub-navigation pill tab switcher */}
      <div className="flex justify-end w-full">
        <RrPillNav
          items={SECURITY_NAV_ITEMS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as RrSecuritySubTab)}
          layoutId={RR_SETTINGS_LAYOUT_IDS.SECURITY_NAV}
        />
      </div>

      {activeTab === RR_SECURITY_SUBTABS.PASSWORD && (
        <RrSecurityPasswordSubTab
          isSubmitting={isSubmitting}
          onChangePassword={handleChangePassword}
          isRefreshing={isRefreshing}
          refreshCountdown={refreshCountdown}
          lastRefreshTime={lastRefreshTime}
          onRefreshToken={handleRefreshToken}
          sessionExpires={session?.expires}
        />
      )}

      {activeTab === RR_SECURITY_SUBTABS.MFA && (
        <RrSecurityMfaSubTab
          mfaStatusData={mfaStatusData}
          passkeysData={passkeysData || []}
          isSubmitting={isSubmitting}
          isTotpSetupOpen={isTotpSetupOpen}
          setIsTotpSetupOpen={setIsTotpSetupOpen}
          totpSecret={totpSecret}
          totpQrUrl={totpQrUrl}
          totpCode={totpCode}
          setTotpCode={setTotpCode}
          onInitiateTotpSetup={handleInitiateTotpSetup}
          onConfirmEnableTotp={handleConfirmEnableTotp}
          isEmailSetupOpen={isEmailSetupOpen}
          setIsEmailSetupOpen={setIsEmailSetupOpen}
          emailOtpCode={emailOtpCode}
          setEmailOtpCode={setEmailOtpCode}
          onInitiateEmailMfa={handleInitiateEmailMfa}
          onConfirmEnableEmailMfa={handleConfirmEnableEmailMfa}
          isPasskeyRegisterOpen={isPasskeyRegisterOpen}
          setIsPasskeyRegisterOpen={setIsPasskeyRegisterOpen}
          passkeyNickname={passkeyNickname}
          setPasskeyNickname={setPasskeyNickname}
          onRegisterPasskey={handleRegisterPasskey}
          showCodesDialog={showCodesDialog}
          setShowCodesDialog={setShowCodesDialog}
          displayedBackupCodes={displayedBackupCodes}
          copiedCodes={copiedCodes}
          onCopyBackupCodes={handleCopyBackupCodes}
          onInitiateRegenerateBackupCodes={() => setIsConfirmRegenerateOpen(true)}
          onConfirmRegenerateBackupCodes={handleConfirmRegenerateBackupCodes}
          onInitiateDisableMfa={handleInitiateDisableMfa}
          onConfirmDisableMfa={handleConfirmDisableMfa}
          isConfirmDisableOpen={isConfirmDisableOpen}
          setIsConfirmDisableOpen={setIsConfirmDisableOpen}
          isConfirmRegenerateOpen={isConfirmRegenerateOpen}
          setIsConfirmRegenerateOpen={setIsConfirmRegenerateOpen}
          disableMethod={disableMethod}
        />
      )}

      {activeTab === RR_SECURITY_SUBTABS.DEVICES && (
        <RrSecurityDevicesSubTab
          devices={devices}
          linkCodeInput={linkCodeInput}
          setLinkCodeInput={setLinkCodeInput}
          isLinking={isLinking}
          onLinkDevice={handleLinkDevice}
          revokeDeviceId={revokeDeviceId}
          setRevokeDeviceId={setRevokeDeviceId}
          isRevoking={isRevoking}
          onRevokeDevice={handleRevokeDevice}
        />
      )}
    </div>
  );
};
