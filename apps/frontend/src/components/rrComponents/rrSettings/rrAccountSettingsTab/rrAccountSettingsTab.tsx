"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Palette, FileText, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { RrPillNav } from "@/components/rrComponents/rrPillNav";
import { RrConfirmDialog } from "@/components/rrComponents/rrConfirmDialog";
import { useTranslation } from "react-i18next";
import {
  RR_ACCOUNT_SUBTABS,
  RR_SETTINGS_LAYOUT_IDS,
  RR_SETTINGS_API_ENDPOINTS,
  RR_EMAIL_REGEX,
  type RrAccountSubTab,
} from "@/lib/constants";

// Subtabs
import { RrAccountVisualsSubTab } from "./rrAccountSettingsTabComponents/rrAccountVisualsSubTab";
import { RrAccountAboutSubTab } from "./rrAccountSettingsTabComponents/rrAccountAboutSubTab";
import { RrAccountInfoSubTab } from "./rrAccountSettingsTabComponents/rrAccountInfoSubTab";

export interface RrAccountSettingsTabProps {
  /** Callback to close the parent settings dialog */
  onOpenChange: (open: boolean) => void;
  /** Optional callback to render custom footer controls into parent settings dialog */
  setFooterContent?: (node: React.ReactNode | null) => void;
}

/**
 * Main container component for Account Settings.
 * Manages pill-nav subtab switching and overall profile save execution.
 */
export const RrAccountSettingsTab = ({
  onOpenChange,
  setFooterContent,
}: RrAccountSettingsTabProps): React.JSX.Element => {
  const { data: session, update } = useSession();
  const { t } = useTranslation();

  // Sub-tab state
  const [activeTab, setActiveTab] = useState<RrAccountSubTab>(
    RR_ACCOUNT_SUBTABS.VISUALS
  );

  // Form states
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [sidebarCardBackgroundUrl, setSidebarCardBackgroundUrl] =
    useState<string>("");
  const [profileSettings, setProfileSettings] = useState<any>({});
  const [bio, setBio] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Image upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [sidebarCardBackgroundFile, setSidebarCardBackgroundFile] =
    useState<File | null>(null);

  const [emailError, setEmailError] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  const { data: profileData } = useSWR<any>(
    session?.user?.username && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.USER_BY_USERNAME(
            session.user.username
          )}`,
          session.accessToken,
        ]
      : null,
    fetcher
  );

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setDisplayName((prev) => prev || user.displayName || user.name || user.username || "");
      setEmail((prev) => prev || user.email || "");
      setAvatarUrl((prev) => prev || user.avatarUrl || user.image || "");
    }
  }, [session]);

  useEffect(() => {
    if (profileData) {
      const user = session?.user as any;
      setDisplayName(
        profileData.displayName ||
          user?.displayName ||
          user?.name ||
          user?.username ||
          ""
      );
      setEmail(profileData.email || user?.email || "");
      setAvatarUrl(
        profileData.avatarUrl ||
          user?.avatarUrl ||
          user?.image ||
          ""
      );
      setBannerUrl(profileData.bannerUrl || "");
      setSidebarCardBackgroundUrl(profileData.sidebarCardBackgroundUrl || "");
      setProfileSettings(profileData.profileSettings || {});
      setBio(profileData.profileSettings?.bio || "");
    }
  }, [profileData, session]);

  useEffect(() => {
    if (session?.user?.username) {
      setAvatarFile(null);
      setBannerFile(null);
      setSidebarCardBackgroundFile(null);
      setConfirmPasswordInput("");
      setIsConfirmOpen(false);
      setEmailError("");
    }
  }, [session]);

  const apiMutate = async (
    url: string,
    method: string = "POST",
    body?: any
  ): Promise<any> => {
    if (!session?.accessToken) throw new Error(t("account.noAccessToken"));
    const headers: HeadersInit = {
      Authorization: `Bearer ${session.accessToken}`,
    };
    let requestBody: any;
    if (body instanceof FormData) {
      requestBody = body;
    } else if (body) {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const res = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(
        errJson?.message || `Request failed with status ${res.status}`
      );
    }
    return res.json().catch(() => null);
  };

  const executeSave = useCallback(
    async (passwordToVerify: string): Promise<void> => {
      setIsSubmitting(true);

      try {
        let finalAvatarUrl = avatarUrl;
        let finalBannerUrl = bannerUrl;
        let finalBackgroundUrl = sidebarCardBackgroundUrl;

        if (avatarFile) {
          const formData = new FormData();
          formData.append("file", avatarFile);

          const uploadData = await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.PUBLIC_UPLOAD}`,
            "POST",
            formData
          );
          finalAvatarUrl = uploadData.url;
        }

        if (bannerFile) {
          const formData = new FormData();
          formData.append("file", bannerFile);

          const uploadData = await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.PUBLIC_UPLOAD}`,
            "POST",
            formData
          );
          finalBannerUrl = uploadData.url;
        }

        if (sidebarCardBackgroundFile) {
          const formData = new FormData();
          formData.append("file", sidebarCardBackgroundFile);

          const uploadData = await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.PUBLIC_UPLOAD}`,
            "POST",
            formData
          );
          finalBackgroundUrl = uploadData.url;
        }

        const updatePayload: any = {
          displayName: displayName || null,
          avatarUrl: finalAvatarUrl || null,
          bannerUrl: finalBannerUrl || null,
          sidebarCardBackgroundUrl: finalBackgroundUrl || null,
        };

        const emailChanged = session?.user?.email
          ? email.toLowerCase() !== session.user?.email.toLowerCase()
          : true;
        if (emailChanged) {
          updatePayload.email = email.toLowerCase();
        }

        if (passwordToVerify) {
          updatePayload.currentPassword = passwordToVerify;
        }

        const updateData = await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.USER_ME}`,
          "PUT",
          updatePayload
        );

        await update({
          displayName: updateData.displayName,
          email: updateData.email,
          avatarUrl: updateData.avatarUrl,
          sidebarCardBackgroundUrl: updateData.sidebarCardBackgroundUrl,
        });

        const bioChanged = bio !== (profileSettings?.bio || "");
        if (bioChanged) {
          await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}${RR_SETTINGS_API_ENDPOINTS.USER_SETTINGS}`,
            "PUT",
            {
              profileSettings: {
                ...profileSettings,
                bio: bio,
              },
            }
          );
        }

        toast.success(t("account.profileUpdated"));
        setIsConfirmOpen(false);
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || t("account.failedUpdateProfile"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      avatarUrl,
      bannerUrl,
      sidebarCardBackgroundUrl,
      avatarFile,
      bannerFile,
      sidebarCardBackgroundFile,
      displayName,
      email,
      bio,
      profileSettings,
      session,
      update,
      onOpenChange,
      t,
    ]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("account.mustBeLoggedIn"));
      return;
    }

    if (email && !RR_EMAIL_REGEX.test(email)) {
      setEmailError(t("account.invalidEmail"));
      return;
    }

    const currentEmail = (session.user?.email || profileData?.email || "")
      .trim()
      .toLowerCase();
    const inputEmail = email.trim().toLowerCase();

    const isEmailChanged =
      !!currentEmail && !!inputEmail && inputEmail !== currentEmail;

    if (isEmailChanged) {
      setIsConfirmOpen(true);
    } else {
      executeSave("");
    }
  }, [session, profileData, email, executeSave, t]);

  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-end w-full gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="text-xs sm:text-sm cursor-pointer px-3 sm:px-4"
        >
          {t("cancel", "Cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          size="sm"
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-4 sm:px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-3.5" />
              <span>{t("saving", "Saving...")}</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>{t("saveChanges", "Save Changes")}</span>
            </>
          )}
        </Button>
      </div>
    );

    return () => {
      setFooterContent(null);
    };
  }, [isSubmitting, handleSave, setFooterContent, onOpenChange, t]);

  const ACCOUNT_NAV_ITEMS = [
    {
      id: RR_ACCOUNT_SUBTABS.VISUALS,
      label: t("account.subTabs.visuals", "Visuals"),
      icon: Palette,
    },
    {
      id: RR_ACCOUNT_SUBTABS.ABOUT,
      label: t("account.subTabs.aboutMe", "About Me"),
      icon: FileText,
    },
    {
      id: RR_ACCOUNT_SUBTABS.INFO,
      label: t("account.subTabs.info", "Information"),
      icon: Info,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-2 h-full min-h-0 flex-1">
      {/* Sub-navigation bar tab switcher */}
      <div className="flex justify-end w-full">
        <RrPillNav
          items={ACCOUNT_NAV_ITEMS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as RrAccountSubTab)}
          layoutId={RR_SETTINGS_LAYOUT_IDS.ACCOUNT_NAV}
        />
      </div>

      {activeTab === RR_ACCOUNT_SUBTABS.VISUALS && (
        <RrAccountVisualsSubTab
          avatarUrl={avatarUrl}
          setAvatarUrl={setAvatarUrl}
          avatarFile={avatarFile}
          setAvatarFile={setAvatarFile}
          bannerUrl={bannerUrl}
          setBannerUrl={setBannerUrl}
          bannerFile={bannerFile}
          setBannerFile={setBannerFile}
          sidebarCardBackgroundUrl={sidebarCardBackgroundUrl}
          setSidebarCardBackgroundUrl={setSidebarCardBackgroundUrl}
          sidebarCardBackgroundFile={sidebarCardBackgroundFile}
          setSidebarCardBackgroundFile={setSidebarCardBackgroundFile}
          displayName={displayName}
          username={session?.user?.username || ""}
          email={email}
        />
      )}

      {activeTab === RR_ACCOUNT_SUBTABS.ABOUT && (
        <RrAccountAboutSubTab bio={bio} setBio={setBio} />
      )}

      {activeTab === RR_ACCOUNT_SUBTABS.INFO && (
        <RrAccountInfoSubTab
          displayName={displayName}
          setDisplayName={setDisplayName}
          email={email}
          setEmail={setEmail}
          emailError={emailError}
          setEmailError={setEmailError}
        />
      )}

      {/* Password Confirmation Dialog using RrConfirmDialog */}
      <RrConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("account.confirmChanges")}
        description={t("account.confirmChangesDesc")}
        confirmText={
          isSubmitting ? t("account.verifying") : t("account.confirm")
        }
        isSubmitting={isSubmitting}
        onConfirm={() => executeSave(confirmPasswordInput)}
      >
        <div className="flex flex-col gap-1.5 py-1 text-left">
          <Label htmlFor="confirm-current-password">
            {t("account.currentPassword")}
          </Label>
          <Input
            id="confirm-current-password"
            type="password"
            value={confirmPasswordInput}
            onChange={(e) => setConfirmPasswordInput(e.target.value)}
            placeholder="••••••••"
            className="h-9 px-3"
            autoFocus
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                confirmPasswordInput &&
                !isSubmitting
              ) {
                e.preventDefault();
                executeSave(confirmPasswordInput);
              }
            }}
          />
        </div>
      </RrConfirmDialog>
    </div>
  );
};
