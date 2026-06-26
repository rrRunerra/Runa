"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Camera, Crop, Trash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Sub-components
import { RrProfileBannerAvatar } from "./rrAccountSettingsTabComponents/rrProfileBannerAvatar";
import { RrSidebarCardShowcase } from "./rrAccountSettingsTabComponents/rrSidebarCardShowcase";
import { RrMarkdownBioEditor } from "./rrAccountSettingsTabComponents/rrMarkdownBioEditor";

interface RrAccountSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrAccountSettingsTab = ({
  onOpenChange,
}: RrAccountSettingsTabProps): React.JSX.Element => {
  const { data: session, update } = useSession();
  const cardBgInputRef = useRef<HTMLInputElement>(null);

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
          `${process.env.NEXT_PUBLIC_API_URL}/user/${session.user.username}`,
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
    if (!session?.accessToken) throw new Error("No access token available");
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

  const handleSave = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    const emailChanged =
      email.toLowerCase() !== session.user.email.toLowerCase();

    if (emailChanged) {
      setIsConfirmOpen(true);
    } else {
      executeSave("");
    }
  };

  const executeSave = async (passwordToVerify: string): Promise<void> => {
    setIsSubmitting(true);

    try {
      let finalAvatarUrl = avatarUrl;
      let finalBannerUrl = bannerUrl;
      let finalBackgroundUrl = sidebarCardBackgroundUrl;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);

        const uploadData = await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, "POST", formData);
        finalAvatarUrl = uploadData.url;
      }

      if (bannerFile) {
        const formData = new FormData();
        formData.append("file", bannerFile);

        const uploadData = await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, "POST", formData);
        finalBannerUrl = uploadData.url;
      }

      if (sidebarCardBackgroundFile) {
        const formData = new FormData();
        formData.append("file", sidebarCardBackgroundFile);

        const uploadData = await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, "POST", formData);
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
        `${process.env.NEXT_PUBLIC_API_URL}/user/update`,
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
          `${process.env.NEXT_PUBLIC_API_URL}/user/settings`,
          "PUT",
          {
            profileSettings: {
              ...profileSettings,
              bio: bio,
            },
          }
        );
      }

      toast.success("Profile updated successfully!");
      setIsConfirmOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2">
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
          <CardTitle>Sidebar User Card Background</CardTitle>
          <CardDescription>
            Upload a custom image to style the bottom user card in your sidebar
            (recommended: 480x96px).
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
                Choose Background
              </Button>
              {sidebarCardBackgroundUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCropImageSrc(
                        getSafeImageUrl(sidebarCardBackgroundUrl),
                      );
                      setIsCropperOpen(true);
                    }}
                    className="h-8 rounded-lg cursor-pointer"
                  >
                    <Crop className="size-3.5 mr-1" />
                    Fit
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
                    Remove
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

      {/* Markdown Bio / Description Section */}
      <RrMarkdownBioEditor bio={bio} setBio={setBio} />

      <div className="p-1">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your public-facing details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="h-9 px-3"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="email">
                {emailError ? (
                  <span className="text-destructive">{emailError}</span>
                ) : (
                  "Email Address"
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
                placeholder="Enter email address"
                className={cn(
                  "h-9 px-3",
                  emailError &&
                    "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/30",
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-xl h-9 cursor-pointer"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Password Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-md font-bold text-left">
              Confirm Account Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-left">
              Please enter your current password to authorize changes to your
              email.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3 text-left">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-current-password">Current Password</Label>
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
              Cancel
            </Button>
            <Button
              onClick={() => executeSave(confirmPasswordInput)}
              disabled={!confirmPasswordInput || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 shadow-sm text-sm"
            >
              {isSubmitting ? "Verifying..." : "Confirm"}
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
        title="Edit Background"
        description="Drag and zoom to fit your user card background."
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
