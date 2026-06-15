"use client";

import type React from "react";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSession } from "next-auth/react";
import { Camera, Eye, EyeOff, Trash, ChevronsUpDown, Crop } from "lucide-react";
import { toast } from "sonner";
import { cn, getSafeImageUrl } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ImageCropperDialog } from "./ui/image-cropper-dialog";

interface AccountSettingsTabProps {
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}



export interface AccountSettingsTabRef {
  handleSave: () => void;
}

export const AccountSettingsTab = forwardRef<AccountSettingsTabRef, AccountSettingsTabProps>(
  ({ onOpenChange, isSubmitting, setIsSubmitting }, ref) => {
    const { data: session, update } = useSession();

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const cardBgInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [bannerUrl, setBannerUrl] = useState("");
    const [sidebarCardBackgroundUrl, setSidebarCardBackgroundUrl] = useState("");

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [sidebarCardBackgroundFile, setSidebarCardBackgroundFile] = useState<File | null>(null);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [passwordCriteria, setPasswordCriteria] = useState({
      length: false,
      maxLength: false,
      uppercase: false,
      number: false,
      special: false,
    });
    const [emailError, setEmailError] = useState("");

    const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Cropper states
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropType, setCropType] = useState<"avatar" | "banner" | "background" | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
    const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);

    useEffect(() => {
      if (session?.user?.username) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${session.user.username}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to fetch user profile");
          })
          .then((data) => {
            setDisplayName(data.displayName || "");
            setEmail(session.user.email || "");
            setAvatarUrl(data.avatarUrl || "");
            setBannerUrl(data.bannerUrl || "");
            setSidebarCardBackgroundUrl(data.sidebarCardBackgroundUrl || "");
          })
          .catch((err) => {
            console.error("Error fetching user profile:", err);
          });

        setAvatarFile(null);
        setBannerFile(null);
        setSidebarCardBackgroundFile(null);
        setNewPassword("");
        setConfirmPassword("");
        setConfirmPasswordInput("");
        setIsConfirmOpen(false);
        setPasswordTouched(false);
        setPasswordCriteria({
          length: false,
          maxLength: false,
          uppercase: false,
          number: false,
          special: false,
        });
        setEmailError("");
      }
    }, [session]);

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validatePassword = (value: string) => {
      setPasswordCriteria({
        length: value.length >= 16,
        maxLength: value.length <= 64,
        uppercase: /[A-Z]/.test(value),
        number: /[0-9]{2,}/.test(value),
        special: /[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]`]/.test(value),
      });
    };

    const isPasswordValid =
      !newPassword ||
      (passwordCriteria.length &&
        passwordCriteria.maxLength &&
        passwordCriteria.uppercase &&
        passwordCriteria.number &&
        passwordCriteria.special);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setCropImageSrc(url);
        setCropType("avatar");
        setIsCropperOpen(true);
        e.target.value = "";
      }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setCropImageSrc(url);
        setCropType("banner");
        setIsCropperOpen(true);
        e.target.value = "";
      }
    };

    const handleCardBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setCropImageSrc(url);
        setCropType("background");
        setIsCropperOpen(true);
        e.target.value = "";
      }
    };

    const handleCropComplete = (croppedFile: File) => {
      const url = URL.createObjectURL(croppedFile);
      if (cropType === "avatar") {
        setAvatarFile(croppedFile);
        setAvatarUrl(url);
      } else if (cropType === "banner") {
        setBannerFile(croppedFile);
        setBannerUrl(url);
      } else if (cropType === "background") {
        setSidebarCardBackgroundFile(croppedFile);
        setSidebarCardBackgroundUrl(url);
      }
    };

    const handlePreSave = () => {
      if (!session?.accessToken) {
        toast.error("You must be logged in to update your profile.");
        return;
      }

      if (email && !EMAIL_REGEX.test(email)) {
        setEmailError("Please enter a valid email address.");
        return;
      }

      if (newPassword && !isPasswordValid) {
        toast.error("Password does not meet the required criteria.");
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }

      const emailChanged = email.toLowerCase() !== session.user.email.toLowerCase();

      if (emailChanged || newPassword) {
        setConfirmPasswordInput("");
        setIsConfirmOpen(true);
      } else {
        executeSave("");
      }
    };

    useImperativeHandle(ref, () => ({
      handleSave: handlePreSave,
    }));

    const executeSave = async (passwordToVerify: string) => {
      setIsSubmitting(true);

      try {
        let finalAvatarUrl = avatarUrl;
        let finalBannerUrl = bannerUrl;
        let finalBackgroundUrl = sidebarCardBackgroundUrl;

        if (avatarFile) {
          const formData = new FormData();
          formData.append("file", avatarFile);

          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.message || "Failed to upload avatar image.");
          }

          const uploadData = await uploadRes.json();
          finalAvatarUrl = uploadData.url;
        }

        if (bannerFile) {
          const formData = new FormData();
          formData.append("file", bannerFile);

          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.message || "Failed to upload banner image.");
          }

          const uploadData = await uploadRes.json();
          finalBannerUrl = uploadData.url;
        }

        if (sidebarCardBackgroundFile) {
          const formData = new FormData();
          formData.append("file", sidebarCardBackgroundFile);

          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/media/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.message || "Failed to upload background image.");
          }

          const uploadData = await uploadRes.json();
          finalBackgroundUrl = uploadData.url;
        }

        const updatePayload: any = {
          displayName: displayName || null,
          avatarUrl: finalAvatarUrl || null,
          bannerUrl: finalBannerUrl || null,
          sidebarCardBackgroundUrl: finalBackgroundUrl || null,
        };

        const emailChanged = email.toLowerCase() !== session!.user.email.toLowerCase();
        if (emailChanged) {
          updatePayload.email = email.toLowerCase();
        }

        if (newPassword) {
          updatePayload.newPassword = newPassword;
        }

        if (passwordToVerify) {
          updatePayload.currentPassword = passwordToVerify;
        }

        const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        });

        const updateData = await updateRes.json();

        if (!updateRes.ok) {
          throw new Error(
            Array.isArray(updateData.message)
              ? updateData.message[0]
              : updateData.message || "Failed to update profile."
          );
        }

        await update({
          displayName: updateData.displayName,
          email: updateData.email,
          avatarUrl: updateData.avatarUrl,
          sidebarCardBackgroundUrl: updateData.sidebarCardBackgroundUrl,
        });

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
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Profile Banner & Avatar
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize your profile banner (recommended: 1200x400px) and avatar image (recommended: 512x512px).
          </p>
        </div>

        {/* Banner & Avatar section */}
        <div className="relative mb-8">
          {/* Banner */}
          <button
            type="button"
            onClick={() => bannerUrl ? setIsBannerMenuOpen(true) : bannerInputRef.current?.click()}
            className="w-full aspect-3/1 bg-linear-to-r from-indigo-500/20 to-purple-500/20 rounded-xl relative overflow-hidden group/banner border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200 block text-left"
          >
            {bannerUrl ? (
              <img src={getSafeImageUrl(bannerUrl)} alt="Banner" className="w-full h-full object-cover" />
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
            onClick={() => avatarUrl ? setIsAvatarMenuOpen(true) : avatarInputRef.current?.click()}
            className="absolute -bottom-6 left-6 size-20 rounded-full border-4 border-card overflow-hidden group/avatar bg-muted shadow-md cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200 block text-left"
          >
            {avatarUrl ? (
              <img src={getSafeImageUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase">
                {displayName ? displayName.charAt(0) : session?.user?.username?.charAt(0) || "U"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Camera className="size-5 text-white" />
            </div>
          </button>
        </div>

        {/* Custom Sidebar Card Background Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border border-zinc-800/50 bg-card/20 backdrop-blur-xs mt-2">
          {/* Uploader Controls */}
          <div className="flex flex-col justify-center space-y-3">
            <div>
              <span className="text-xs font-semibold text-foreground">Sidebar User Card Background</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload a custom image to style the bottom user card in your sidebar (recommended: 480x96px).
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => cardBgInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                <Camera className="size-3.5" />
                Choose Background
              </Button>
              {sidebarCardBackgroundUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCropImageSrc(getSafeImageUrl(sidebarCardBackgroundUrl));
                      setCropType("background");
                      setIsCropperOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl border border-zinc-800 text-xs font-semibold hover:bg-muted/50 cursor-pointer"
                  >
                    <Crop className="size-3.5" />
                    Fit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSidebarCardBackgroundUrl("");
                      setSidebarCardBackgroundFile(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold cursor-pointer"
                  >
                    <Trash className="size-3.5" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Live Showcase Preview */}
          <div className="flex flex-col justify-center items-center p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 relative overflow-hidden min-h-[90px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-2 font-bold select-none">
              Sidebar Card Showcase
            </div>
            {/* Preview Card */}
            <div
              className="h-12 w-full max-w-[240px] flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800/40 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden transition-all duration-300 isolate transform-[translate3d(0,0,0)]"
            >
              {/* Custom Card Background Image */}
              {sidebarCardBackgroundUrl && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{
                      backgroundImage: `url(${sidebarCardBackgroundUrl.startsWith("blob:") ? sidebarCardBackgroundUrl : getSafeImageUrl(sidebarCardBackgroundUrl)})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent z-0" />
                </>
              )}
              
              <div className="relative size-8 rounded-full border border-zinc-800/60 shadow-sm shrink-0 overflow-hidden z-10 bg-muted">
                {avatarUrl ? (
                  <img
                    src={avatarUrl.startsWith("blob:") ? avatarUrl : getSafeImageUrl(avatarUrl)}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                    {displayName ? displayName.charAt(0).toUpperCase() : session?.user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              
              <div className="grid flex-1 text-left text-xs leading-tight ml-1.5 z-10">
                <span className={cn(
                  "truncate font-bold",
                  sidebarCardBackgroundUrl ? "text-white" : "text-foreground"
                )}>
                  {displayName || session?.user?.username || "Username"}
                </span>
                <span className={cn(
                  "truncate text-[10px]",
                  sidebarCardBackgroundUrl ? "text-zinc-300" : "text-muted-foreground/80"
                )}>
                  {email || session?.user?.email || "email@example.com"}
                </span>
              </div>
              <ChevronsUpDown className={cn(
                "ml-auto size-3.5 z-10",
                sidebarCardBackgroundUrl ? "text-zinc-400" : "text-muted-foreground/60"
              )} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
          {/* Left Column - Details */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Profile Information
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your public-facing details.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="h-9 px-3"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                {emailError ? (
                  <span className="text-red-500">{emailError}</span>
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
                  emailError && "border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30"
                )}
              />
            </div>
          </div>

          {/* Right Column - Password */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Security & Password
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Update your password credentials.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  maxLength={64}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    validatePassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  onFocus={() => { if (!passwordTouched && newPassword.length > 0) setPasswordTouched(true); }}
                  onBlur={() => setPasswordTouched(false)}
                  placeholder="••••••••"
                  className={cn(
                    "h-9 px-3 pr-9",
                    newPassword && !isPasswordValid && "border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  {showNewPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>

              {(passwordTouched || (newPassword.length > 0 && !isPasswordValid)) && (
                <div className="mt-1.5 p-3 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Password Criteria
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {[
                      { key: "length", label: "Min 16 characters" },
                      { key: "maxLength", label: "Max 64 characters" },
                      { key: "uppercase", label: "One uppercase letter" },
                      { key: "number", label: "Two numbers" },
                      { key: "special", label: "One special character" },
                    ].map((item) => (
                      <li
                        key={item.key}
                        className={cn(
                          "flex items-center gap-2 text-[11px] transition-all duration-200",
                          passwordCriteria[item.key as keyof typeof passwordCriteria]
                            ? "text-emerald-500 font-medium"
                            : "text-muted-foreground/60",
                        )}
                      >
                        <div
                          className={cn(
                            "size-1.5 rounded-full transition-all",
                            passwordCriteria[item.key as keyof typeof passwordCriteria]
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-muted-foreground/30",
                          )}
                        />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "h-9 px-3 pr-9",
                    confirmPassword && newPassword !== confirmPassword && "border-red-500/50 bg-red-500/5 focus-visible:ring-red-500/30"
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  {showConfirmPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>
        </div>

        {/* Password Confirmation Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-md font-bold">Confirm Account Changes</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Please enter your current password to authorize changes to your email or password.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
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
                    if (e.key === "Enter" && confirmPasswordInput && !isSubmitting) {
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
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg text-sm"
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
          aspectRatio={cropType === "banner" ? 3 : cropType === "background" ? 5 : 1}
          title={
            cropType === "avatar"
              ? "Edit Avatar"
              : cropType === "banner"
              ? "Edit Banner"
              : "Edit Background"
          }
          description={
            cropType === "avatar"
              ? "Drag and zoom to fit your avatar."
              : cropType === "banner"
              ? "Drag and zoom to fit your profile banner."
              : "Drag and zoom to fit your user card background."
          }
          onCrop={handleCropComplete}
        />

        {/* Avatar Options Menu */}
        <Dialog open={isAvatarMenuOpen} onOpenChange={setIsAvatarMenuOpen}>
          <DialogContent className="max-w-xs bg-card border border-border shadow-2xl p-6 rounded-2xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-bold text-center">Profile Picture Options</DialogTitle>
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-zinc-800 text-xs font-semibold hover:bg-muted/50"
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold"
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
              <DialogTitle className="text-sm font-bold text-center">Profile Banner Options</DialogTitle>
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-zinc-800 text-xs font-semibold hover:bg-muted/50"
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
                    className="flex items-center justify-center gap-2 w-full py-2.5 h-auto rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-semibold"
                  >
                    <Trash className="size-3.5" />
                    Remove Banner
                  </Button>
                </>
              )}

            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden inputs for direct explorer trigger */}
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
);

AccountSettingsTab.displayName = "AccountSettingsTab";
