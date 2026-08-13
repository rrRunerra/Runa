import React, { useRef, useState } from "react";
import Image from "next/image";
import { Camera, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { getSafeImageUrl } from "@/lib/inputValidation";

export interface RrProfileBannerAvatarProps {
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  avatarFile: File | null;
  setAvatarFile: (file: File | null) => void;
  bannerUrl: string;
  setBannerUrl: (url: string) => void;
  bannerFile: File | null;
  setBannerFile: (file: File | null) => void;
  displayName: string;
  username: string;
}

/**
 * Component for editing user avatar and banner images. Opens cropper modal automatically upon file selection.
 */
export function RrProfileBannerAvatar({
  avatarUrl,
  setAvatarUrl,
  setAvatarFile,
  bannerUrl,
  setBannerUrl,
  setBannerFile,
  displayName,
  username,
}: RrProfileBannerAvatarProps): React.JSX.Element {
  const { t } = useTranslation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [cropperState, setCropperState] = useState<{
    open: boolean;
    imageSrc: string;
    aspectRatio: number;
    type: "avatar" | "banner";
  }>({
    open: false,
    imageSrc: "",
    aspectRatio: 1,
    type: "avatar",
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropperState({
        open: true,
        imageSrc: url,
        aspectRatio: 1,
        type: "avatar",
      });
      e.target.value = "";
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropperState({
        open: true,
        imageSrc: url,
        aspectRatio: 3 / 1,
        type: "banner",
      });
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedFile: File): void => {
    const url = URL.createObjectURL(croppedFile);
    if (cropperState.type === "avatar") {
      setAvatarFile(croppedFile);
      setAvatarUrl(url);
    } else {
      setBannerFile(croppedFile);
      setBannerUrl(url);
    }
  };

  return (
    <Card className="w-full text-left">
      <CardHeader>
        <CardTitle>
          {t("account.profileBannerAvatarTitle", "Profile Banner & Avatar")}
        </CardTitle>
        <CardDescription>
          {t(
            "account.profileBannerAvatarDesc",
            "Customize your profile banner (recommended: 1200x266px) and avatar image (recommended: 512x512px).",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full rounded-2xl border border-border bg-card overflow-hidden text-left">
          {/* Banner Section */}
          <div className="relative h-44 sm:h-52 w-full bg-muted/40 overflow-hidden group">
            {bannerUrl ? (
              <Image
                src={getSafeImageUrl(bannerUrl)}
                alt="Profile Banner"
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                priority
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-linear-to-r from-primary/20 via-primary/10 to-muted flex items-center justify-center text-muted-foreground/40 text-xs font-semibold uppercase tracking-widest">
                {t("account.noBannerSet", "No banner set")}
              </div>
            )}

            {/* Banner Overlay Controls */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-10">
              <Button
                type="button"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
                className="h-9 px-3.5 rounded-xl cursor-pointer text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg"
              >
                <Camera className="size-3.5 mr-1.5" />
                {bannerUrl
                  ? t("account.changeBanner", "Change Banner")
                  : t("account.uploadBanner", "Upload Banner")}
              </Button>

              {bannerUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setBannerUrl("");
                    setBannerFile(null);
                  }}
                  className="h-9 px-3 rounded-xl cursor-pointer text-xs font-bold bg-destructive hover:bg-destructive/95 text-destructive-foreground shadow-lg"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Avatar Section & Information Bar */}
          <div className="p-4 sm:p-6 pt-0 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 relative z-10">
            <div className="flex items-end gap-4">
              <div className="relative group/avatar">
                <Avatar className="size-24 sm:size-28 rounded-full border-4 border-card shadow-xl overflow-hidden bg-background relative">
                  {avatarUrl ? (
                    <Image
                      src={getSafeImageUrl(avatarUrl)}
                      alt={displayName || username || "Avatar"}
                      fill
                      sizes="112px"
                      priority
                      unoptimized
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="text-xl font-bold bg-muted text-foreground">
                      {(displayName || username || "U")
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Avatar Hover Trigger */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer text-[10px] font-semibold gap-1 z-20"
                >
                  <RefreshCw className="size-4" />
                  <span>{t("account.change", "Change")}</span>
                </button>
              </div>
            </div>

            {/* Action Controls for Avatar */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                className="h-8 text-xs rounded-xl cursor-pointer"
              >
                <Camera className="size-3.5 mr-1" />
                {t("account.changeAvatar", "Change Avatar")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBannerChange}
      />

      {/* Image Cropper Modal (Triggers automatically when selecting a new file) */}
      <ImageCropperDialog
        open={cropperState.open}
        onOpenChange={(open) => setCropperState((prev) => ({ ...prev, open }))}
        imageSrc={cropperState.imageSrc}
        aspectRatio={cropperState.aspectRatio}
        title={
          cropperState.type === "avatar"
            ? t("account.cropAvatarTitle", "Crop Avatar Image")
            : t("account.cropBannerTitle", "Crop Banner Image")
        }
        description={t(
          "account.cropInstruction",
          "Drag and adjust the crop frame to your preferred view.",
        )}
        onCrop={handleCropComplete}
      />
    </Card>
  );
}
