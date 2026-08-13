"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Camera, Crop, Trash, Palette, FileText, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { RrPillNav } from "@/components/rrComponents/rrPillNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { useTranslation } from "react-i18next";

// Sub-components
import { RrProfileBannerAvatar } from "./rrAccountSettingsTabComponents/rrProfileBannerAvatar";
import { RrSidebarCardShowcase } from "./rrAccountSettingsTabComponents/rrSidebarCardShowcase";
import { RrMarkdownBioEditor } from "./rrAccountSettingsTabComponents/rrMarkdownBioEditor";

interface RrAccountSettingsTabProps {
  onOpenChange: (open: boolean) => void;
  setFooterContent?: (node: React.ReactNode | null) => void;
}

type AccountSubTab = "visuals" | "about" | "info";

export const RrAccountSettingsTab = ({
  onOpenChange,
  setFooterContent,
}: RrAccountSettingsTabProps): React.JSX.Element => {
  const { data: session, update } = useSession();
  const { t } = useTranslation();
  const cardBgInputRef = useRef<HTMLInputElement>(null);

  // Sub-tab state
  const [activeTab, setActiveTab] = useState<AccountSubTab>("visuals");

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

  // Card Background Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);

  const { data: profileData } = useSWR<any>(
    session?.user?.username && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/${session.user.username}`,
          session.accessToken,
        ]
      : null,
    fetcher
  );

  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.displayName || "");
      setEmail(session?.user?.email || "");
      setAvatarUrl(profileData.avatarUrl || "");
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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const apiMutate = async (url: string, method: string = "POST", body?: any) => {
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
      throw new Error(errJson?.message || `Request failed with status ${res.status}`);
    }
    return res.json().catch(() => null);
  };

  const handleCardBgChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setIsCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedFile: File): void => {
    const url = URL.createObjectURL(croppedFile);
    setSidebarCardBackgroundFile(croppedFile);
    setSidebarCardBackgroundUrl(url);
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
            `${process.env.NEXT_PUBLIC_API_URL}/public/upload`,
            "POST",
            formData
          );
          finalAvatarUrl = uploadData.url;
        }

        if (bannerFile) {
          const formData = new FormData();
          formData.append("file", bannerFile);

          const uploadData = await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}/public/upload`,
            "POST",
            formData
          );
          finalBannerUrl = uploadData.url;
        }

        if (sidebarCardBackgroundFile) {
          const formData = new FormData();
          formData.append("file", sidebarCardBackgroundFile);

          const uploadData = await apiMutate(
            `${process.env.NEXT_PUBLIC_API_URL}/public/upload`,
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
          ? email.toLowerCase() !== session.user.email.toLowerCase()
          : true;
        if (emailChanged) {
          updatePayload.email = email.toLowerCase();
        }

        if (passwordToVerify) {
          updatePayload.currentPassword = passwordToVerify;
        }

        const updateData = await apiMutate(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
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
            `${process.env.NEXT_PUBLIC_API_URL}/users/me/settings`,
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

    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError(t("account.invalidEmail"));
      return;
    }

    const emailChanged =
      session.user?.email &&
      email.toLowerCase() !== session.user.email.toLowerCase();

    if (emailChanged) {
      setIsConfirmOpen(true);
    } else {
      executeSave("");
    }
  }, [session, email, executeSave, t]);

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
          {t("cancel")}
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
              <span>{t("saving")}</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>{t("saveChanges")}</span>
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
      id: "visuals" as const,
      label: t("account.subTabs.visuals", "Visuals"),
      icon: Palette,
    },
    {
      id: "about" as const,
      label: t("account.subTabs.aboutMe", "About Me"),
      icon: FileText,
    },
    {
      id: "info" as const,
      label: t("account.subTabs.info", "Information"),
      icon: Info,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-2 h-full min-h-0 flex-1">
      {/* Sub-navigation bar tab switcher locked to right */}
      <div className="flex justify-end w-full">
        <RrPillNav
          items={ACCOUNT_NAV_ITEMS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id)}
          layoutId="accountSettingsCategoryHighlight"
        />
      </div>

      {activeTab === "visuals" && (
        <div className="flex flex-col gap-6 w-full">
          {/* Profile Banner & Avatar */}
          <RrProfileBannerAvatar
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
            avatarFile={avatarFile}
            setAvatarFile={setAvatarFile}
            bannerUrl={bannerUrl}
            setBannerUrl={setBannerUrl}
            bannerFile={bannerFile}
            setBannerFile={setBannerFile}
            displayName={displayName}
            username={session?.user?.username || ""}
          />

          {/* Custom Sidebar Card Background Section */}
          <Card className="pr-2 pb-2">
            <CardHeader>
              <CardTitle>{t("account.sidebarCardBg")}</CardTitle>
              <CardDescription>
                {t("account.sidebarCardBgDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Uploader Controls */}
              <div className="flex flex-col justify-center gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => cardBgInputRef.current?.click()}
                    className="h-8 rounded-lg cursor-pointer"
                  >
                    <Camera className="size-3.5 mr-1" />
                    {t("account.chooseBackground")}
                  </Button>
                  {sidebarCardBackgroundUrl && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCropImageSrc(
                            getSafeImageUrl(sidebarCardBackgroundUrl)
                          );
                          setIsCropperOpen(true);
                        }}
                        className="h-8 rounded-lg cursor-pointer"
                      >
                        <Crop className="size-3.5 mr-1" />
                        {t("account.fit")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSidebarCardBackgroundUrl("");
                          setSidebarCardBackgroundFile(null);
                        }}
                        className="h-8 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <Trash className="size-3.5 mr-1" />
                        {t("account.remove")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Live Showcase Preview */}
              <RrSidebarCardShowcase
                sidebarCardBackgroundUrl={sidebarCardBackgroundUrl}
                avatarUrl={avatarUrl}
                displayName={displayName}
                username={session?.user?.username || ""}
                email={email}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "about" && (
        <div className="w-full flex-1 flex flex-col min-h-0 h-full">
          <RrMarkdownBioEditor bio={bio} setBio={setBio} />
        </div>
      )}

      {activeTab === "info" && (
        <div className="p-1 w-full">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>{t("account.profileInformation")}</CardTitle>
              <CardDescription>{t("account.publicDetails")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <Label htmlFor="display-name">{t("account.displayName")}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("account.enterDisplayName")}
                  className="h-9 px-3"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <Label htmlFor="email">
                  {emailError ? (
                    <span className="text-destructive">{emailError}</span>
                  ) : (
                    t("account.emailAddress")
                  )}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder={t("account.enterEmailAddress")}
                  className={cn(
                    "h-9 px-3",
                    emailError &&
                      "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/30"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-md font-bold text-left">
              {t("account.confirmChanges")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
              {t("account.confirmChangesDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3 text-left">
            <div className="flex flex-col gap-1.5">
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
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsConfirmOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-lg text-sm"
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => executeSave(confirmPasswordInput)}
              disabled={!confirmPasswordInput || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
            >
              {isSubmitting ? t("account.verifying") : t("account.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={cropImageSrc || ""}
        aspectRatio={5}
        title={t("account.editBackground")}
        description={t("account.cropBackgroundDesc")}
        onCrop={handleCropComplete}
      />

      {/* Hidden inputs for direct explorer trigger */}
      <input
        ref={cardBgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardBgChange}
      />
    </div>
  );
};

