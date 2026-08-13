"use client";

import type React from "react";
import { useState, useRef } from "react";
import { Camera, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { RrProfileBannerAvatar } from "./rrProfileBannerAvatar";
import { RrSidebarCardShowcase } from "./rrSidebarCardShowcase";
import { RR_SETTINGS_LIMITS } from "@/lib/constants";

export interface RrAccountVisualsSubTabProps {
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  avatarFile: File | null;
  setAvatarFile: (file: File | null) => void;
  bannerUrl: string;
  setBannerUrl: (url: string) => void;
  bannerFile: File | null;
  setBannerFile: (file: File | null) => void;
  sidebarCardBackgroundUrl: string;
  setSidebarCardBackgroundUrl: (url: string) => void;
  sidebarCardBackgroundFile: File | null;
  setSidebarCardBackgroundFile: (file: File | null) => void;
  displayName: string;
  username: string;
  email: string;
}

/**
 * Visuals subtab component managing avatar, profile banner, and custom sidebar card background images.
 */
export function RrAccountVisualsSubTab({
  avatarUrl,
  setAvatarUrl,
  avatarFile,
  setAvatarFile,
  bannerUrl,
  setBannerUrl,
  bannerFile,
  setBannerFile,
  sidebarCardBackgroundUrl,
  setSidebarCardBackgroundUrl,
  sidebarCardBackgroundFile: _sidebarCardBackgroundFile,
  setSidebarCardBackgroundFile,
  displayName,
  username,
  email,
}: RrAccountVisualsSubTabProps): React.JSX.Element {
  const { t } = useTranslation();
  const cardBgInputRef = useRef<HTMLInputElement>(null);

  // Card Background Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);

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

  return (
    <div className="flex flex-col gap-6 w-full text-left">
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
        username={username}
      />

      {/* Custom Sidebar Card Background Section */}
      <Card className="pr-2 pb-2">
        <CardHeader>
          <CardTitle>
            {t("account.sidebarCardBg", "Sidebar User Card Background")}
          </CardTitle>
          <CardDescription>
            {t(
              "account.sidebarCardBgDesc",
              "Upload a custom image to style the bottom user card in your sidebar (recommended: 480x96px)."
            )}
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
                {t("account.chooseBackground", "Choose Background")}
              </Button>
              {sidebarCardBackgroundUrl && (
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
                  {t("account.remove", "Remove")}
                </Button>
              )}
            </div>
          </div>

          {/* Live Showcase Preview */}
          <RrSidebarCardShowcase
            sidebarCardBackgroundUrl={sidebarCardBackgroundUrl}
            avatarUrl={avatarUrl}
            displayName={displayName}
            username={username}
            email={email}
          />
        </CardContent>
      </Card>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={cropImageSrc || ""}
        aspectRatio={RR_SETTINGS_LIMITS.CROPPER_ASPECT_RATIO}
        title={t("account.editBackground", "Edit Background Image")}
        description={t(
          "account.cropBackgroundDesc",
          "Drag and adjust the crop frame for your sidebar card background."
        )}
        onCrop={handleCropComplete}
      />

      {/* Hidden file input */}
      <input
        ref={cardBgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardBgChange}
      />
    </div>
  );
}
