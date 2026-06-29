import * as React from "react";
import { useState, useRef } from "react";
import { Camera, Crop, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function RrProfileBannerAvatar({
  avatarUrl,
  setAvatarUrl,
  avatarFile: _avatarFile,
  setAvatarFile,
  bannerUrl,
  setBannerUrl,
  bannerFile: _bannerFile,
  setBannerFile,
  displayName,
  username,
}: RrProfileBannerAvatarProps): React.JSX.Element {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Modal and Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "banner" | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState<boolean>(false);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState<boolean>(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropType("avatar");
      setIsCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropType("banner");
      setIsCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedFile: File): void => {
    const url = URL.createObjectURL(croppedFile);
    if (cropType === "avatar") {
      setAvatarFile(croppedFile);
      setAvatarUrl(url);
    } else if (cropType === "banner") {
      setBannerFile(croppedFile);
      setBannerUrl(url);
    }
  };

  return (
    <>
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Profile Banner & Avatar</CardTitle>
          <CardDescription>
            Customize your profile banner (recommended: 1200x400px) and avatar
            image (recommended: 512x512px).
          </CardDescription>
        </CardHeader>
        <CardContent className="relative pb-8 text-left">
          {/* Banner */}
          <button
            type="button"
            onClick={() =>
              bannerUrl
                ? setIsBannerMenuOpen(true)
                : bannerInputRef.current?.click()
            }
            className="w-full aspect-3/1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl relative overflow-hidden group/banner border border-border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200 block text-left"
          >
            {bannerUrl ? (
              <img
                src={getSafeImageUrl(bannerUrl)}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                No banner uploaded
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/banner:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Camera className="size-6 text-white" />
            </div>
          </button>

          {/* Avatar */}
          <button
            type="button"
            onClick={() =>
              avatarUrl
                ? setIsAvatarMenuOpen(true)
                : avatarInputRef.current?.click()
            }
            className="absolute -bottom-6 left-6 size-20 rounded-full border-4 border-card overflow-hidden group/avatar bg-muted shadow-md cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200 block text-left"
          >
            {avatarUrl ? (
              <img
                src={getSafeImageUrl(avatarUrl)}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase">
                {displayName
                  ? displayName.charAt(0)
                  : username?.charAt(0) || "U"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Camera className="size-5 text-white" />
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Image Cropper Dialog */}
      <ImageCropperDialog
        open={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={cropImageSrc || ""}
        aspectRatio={cropType === "banner" ? 3 : 1}
        title={cropType === "avatar" ? "Edit Avatar" : "Edit Banner"}
        description={
          cropType === "avatar"
            ? "Drag and zoom to fit your avatar."
            : "Drag and zoom to fit your profile banner."
        }
        onCrop={handleCropComplete}
      />

      {/* Avatar Options Menu */}
      <Dialog open={isAvatarMenuOpen} onOpenChange={setIsAvatarMenuOpen}>
        <DialogContent className="max-w-xs bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-center">
              Profile Picture Options
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <Button
              onClick={() => {
                avatarInputRef.current?.click();
                setIsAvatarMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer transition-all shadow-xs text-center"
            >
              <Camera className="size-3.5" />
              Upload New Image
            </Button>

            {avatarUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCropImageSrc(getSafeImageUrl(avatarUrl));
                    setCropType("avatar");
                    setIsCropperOpen(true);
                    setIsAvatarMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-border text-xs font-semibold hover:bg-muted/50"
                >
                  <Crop className="size-3.5" />
                  Position & Fit
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setAvatarUrl("");
                    setAvatarFile(null);
                    setIsAvatarMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                >
                  <Trash className="size-3.5" />
                  Remove Picture
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Banner Options Menu */}
      <Dialog open={isBannerMenuOpen} onOpenChange={setIsBannerMenuOpen}>
        <DialogContent className="max-w-xs bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-bold text-center">
              Profile Banner Options
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <Button
              onClick={() => {
                bannerInputRef.current?.click();
                setIsBannerMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs cursor-pointer transition-all shadow-xs text-center"
            >
              <Camera className="size-3.5" />
              Upload New Banner
            </Button>

            {bannerUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCropImageSrc(getSafeImageUrl(bannerUrl));
                    setCropType("banner");
                    setIsCropperOpen(true);
                    setIsBannerMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-border text-xs font-semibold hover:bg-muted/50"
                >
                  <Crop className="size-3.5" />
                  Position & Fit
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setBannerUrl("");
                    setBannerFile(null);
                    setIsBannerMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                >
                  <Trash className="size-3.5" />
                  Remove Banner
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden inputs */}
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
    </>
  );
}
