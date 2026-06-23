"use client";

import type React from "react";
import {
  useState,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  Trash,
  ChevronsUpDown,
  Crop,
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Heading,
  Code,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  CardFooter,
} from "@/components/ui/card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { getSafeImageUrl } from "@/lib/inputValidation";

interface RrAccountSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrAccountSettingsTab = ({ onOpenChange }: RrAccountSettingsTabProps): React.JSX.Element => {
  const { data: session, update } = useSession();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const cardBgInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [sidebarCardBackgroundUrl, setSidebarCardBackgroundUrl] = useState<string>("");
  const [profileSettings, setProfileSettings] = useState<any>({});
  const [bio, setBio] = useState<string>("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const insertMarkdown = (syntax: string, placeholder = ""): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let newCursorPos = start;

    if (syntax === "bold") {
      replacement = `**${selectedText || placeholder || "bold text"}**`;
      newCursorPos = start + (selectedText ? replacement.length : 2);
    } else if (syntax === "italic") {
      replacement = `*${selectedText || placeholder || "italic text"}*`;
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "link") {
      replacement = `[${selectedText || placeholder || "link text"}](https://example.com)`;
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "code") {
      if (selectedText.includes("\n")) {
        replacement = `\`\`\`\n${selectedText || placeholder || "code block"}\n\`\`\``;
      } else {
        replacement = `\`${selectedText || placeholder || "code"}\``;
      }
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "heading") {
      replacement = `\n## ${selectedText || placeholder || "Heading"}\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "bullet") {
      replacement = `\n- ${selectedText || placeholder || "List item"}\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "number") {
      replacement = `\n1. ${selectedText || placeholder || "List item"}\n`;
      newCursorPos = start + replacement.length;
    }

    setBio(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [sidebarCardBackgroundFile, setSidebarCardBackgroundFile] = useState<File | null>(null);

  const [emailError, setEmailError] = useState<string>("");

  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Cropper states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "banner" | "background" | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState<boolean>(false);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState<boolean>(false);

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
          setProfileSettings(data.profileSettings || {});
          setBio(data.profileSettings?.bio || "");
        })
        .catch((err) => {
          console.error("Error fetching user profile:", err);
        });

      setAvatarFile(null);
      setBannerFile(null);
      setSidebarCardBackgroundFile(null);
      setConfirmPasswordInput("");
      setIsConfirmOpen(false);
      setEmailError("");
    }
  }, [session]);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const handleCardBgChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropImageSrc(url);
      setCropType("background");
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
    } else if (cropType === "background") {
      setSidebarCardBackgroundFile(croppedFile);
      setSidebarCardBackgroundUrl(url);
    }
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

    const emailChanged = email.toLowerCase() !== session.user.email.toLowerCase();

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

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/media/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          },
        );

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

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/media/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          },
        );

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

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/media/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(
            errData.message || "Failed to upload background image.",
          );
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

      const emailChanged = session?.user?.email ? email.toLowerCase() !== session.user.email.toLowerCase() : true;
      if (emailChanged) {
        updatePayload.email = email.toLowerCase();
      }

      if (passwordToVerify) {
        updatePayload.currentPassword = passwordToVerify;
      }

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session!.accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        },
      );

      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(
          Array.isArray(updateData.message)
            ? updateData.message[0]
            : updateData.message || "Failed to update profile.",
        );
      }

      await update({
        displayName: updateData.displayName,
        email: updateData.email,
        avatarUrl: updateData.avatarUrl,
        sidebarCardBackgroundUrl: updateData.sidebarCardBackgroundUrl,
      });

      const bioChanged = bio !== (profileSettings?.bio || "");
      if (bioChanged) {
        const settingsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/settings`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session!.accessToken}`,
            },
            body: JSON.stringify({
              profileSettings: {
                ...profileSettings,
                bio: bio,
              },
            }),
          },
        );

        if (!settingsRes.ok) {
          const settingsData = await settingsRes.json();
          throw new Error(
            Array.isArray(settingsData.message)
              ? settingsData.message[0]
              : settingsData.message || "Failed to update profile description.",
          );
        }
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
    <div className="space-y-6">
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>Profile Banner & Avatar</CardTitle>
          <CardDescription>
            Customize your profile banner (recommended: 1200x400px) and avatar image (recommended: 512x512px).
          </CardDescription>
        </CardHeader>
        <CardContent className="relative pb-8">
        {/* Banner */}
        <button
          type="button"
          onClick={() =>
            bannerUrl
              ? setIsBannerMenuOpen(true)
              : bannerInputRef.current?.click()
          }
          className="w-full aspect-[3/1] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl relative overflow-hidden group/banner border border-border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200 block text-left"
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
                : session?.user?.username?.charAt(0) || "U"}
            </div>
          )}
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Camera className="size-5 text-white" />
          </div>
        </button>
      </CardContent>
    </Card>

      {/* Custom Sidebar Card Background Section */}
      <Card>
        <CardHeader>
          <CardTitle>Sidebar User Card Background</CardTitle>
          <CardDescription>
            Upload a custom image to style the bottom user card in your sidebar (recommended: 480x96px).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Uploader Controls */}
          <div className="flex flex-col justify-center space-y-3">
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
                      setCropImageSrc(getSafeImageUrl(sidebarCardBackgroundUrl));
                      setCropType("background");
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
          <div className="flex flex-col justify-center items-center p-4 rounded-xl border border-dashed border-border bg-muted/10 relative overflow-hidden min-h-[90px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-2 font-bold select-none">
              Sidebar Card Showcase
            </div>
            {/* Preview Card */}
            <div className="h-12 w-full max-w-[240px] flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/40 backdrop-blur-xl relative overflow-hidden transition-all duration-300 isolate transform-[translate3d(0,0,0)]">
              {/* Custom Card Background Image */}
              {sidebarCardBackgroundUrl && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center z-0"
                    style={{
                      backgroundImage: `url(${sidebarCardBackgroundUrl.startsWith("blob:") ? sidebarCardBackgroundUrl : getSafeImageUrl(sidebarCardBackgroundUrl)})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-0" />
                </>
              )}

              <div className="relative size-8 rounded-full border border-border shadow-sm shrink-0 overflow-hidden z-10 bg-muted">
                {avatarUrl ? (
                  <img
                    src={
                      avatarUrl.startsWith("blob:")
                        ? avatarUrl
                        : getSafeImageUrl(avatarUrl)
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                    {displayName
                      ? displayName.charAt(0).toUpperCase()
                      : session?.user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="grid flex-1 text-left text-xs leading-tight ml-1.5 z-10">
                <span
                  className={cn(
                    "truncate font-bold",
                    sidebarCardBackgroundUrl ? "text-white" : "text-foreground",
                  )}
                >
                  {displayName || session?.user?.username || "Username"}
                </span>
                <span
                  className={cn(
                    "truncate text-[10px]",
                    sidebarCardBackgroundUrl
                      ? "text-zinc-300"
                      : "text-muted-foreground/80",
                  )}
                >
                  {email || session?.user?.email || "email@example.com"}
                </span>
              </div>
              <ChevronsUpDown
                className={cn(
                  "ml-auto size-3.5 z-10",
                  sidebarCardBackgroundUrl
                    ? "text-zinc-400"
                    : "text-muted-foreground/60",
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Markdown Bio / Description Section */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 space-y-0">
          <div className="space-y-0.5">
            <CardTitle>About Me (Markdown Bio)</CardTitle>
            <CardDescription>Describe yourself using Markdown. Script/HTML tags are filtered.</CardDescription>
          </div>
          {/* Write/Preview Switcher */}
          <div className="flex border border-border rounded-lg p-0.5 bg-muted/45 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEditorTab("write")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer",
                editorTab === "write"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setEditorTab("preview")}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer",
                editorTab === "preview"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {editorTab === "write" ? (
            <div className="border border-border rounded-xl overflow-hidden bg-muted/25 flex flex-col">
              {/* Markdown Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 border-b border-border">
                <button
                  type="button"
                  onClick={() => insertMarkdown("bold", "bold text")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Bold"
                >
                  <Bold className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("italic", "italic text")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Italic"
                >
                  <Italic className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("heading", "Heading")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Heading"
                >
                  <Heading className="size-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown("link", "link text")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Insert Link"
                >
                  <Link className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("code", "code")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Code Block"
                >
                  <Code className="size-3.5" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button
                  type="button"
                  onClick={() => insertMarkdown("bullet", "List item")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Bullet List"
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("number", "List item")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered className="size-3.5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={4000}
                placeholder="Write a description about yourself... (supports markdown)"
                className="w-full h-36 md:h-44 p-3 bg-transparent text-xs md:text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50 resize-none font-sans"
              />
              <div className="flex justify-end px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground font-semibold tabular-nums select-none">
                {bio.length} / 4000
              </div>
            </div>
          ) : (
            /* Preview Container */
            <div className="w-full h-36 md:h-44 overflow-y-auto p-3.5 border border-border bg-muted/10 rounded-xl text-xs md:text-sm text-muted-foreground leading-relaxed custom-scrollbar animate-in fade-in duration-200">
              {bio.trim() ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-sm font-black text-foreground mt-3 mb-1.5 uppercase tracking-wide"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-xs font-black text-foreground mt-2.5 mb-1 uppercase tracking-wide"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-[11px] font-bold text-foreground mt-2 mb-0.5 uppercase tracking-wider"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p
                        className="mb-2 last:mb-0 text-muted-foreground leading-relaxed"
                        {...props}
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc pl-4 mb-2 space-y-0.5"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal pl-4 mb-2 space-y-0.5"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="text-xs text-muted-foreground" {...props} />
                    ),
                    strong: ({ ...props }) => (
                      <strong className="font-extrabold text-foreground" {...props} />
                    ),
                    em: ({ ...props }) => (
                      <em className="italic" {...props} />
                    ),
                    code: ({ inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-[10px] border border-border"
                          {...props}
                        />
                      ) : (
                        <pre className="bg-muted border border-border p-2.5 rounded-lg overflow-x-auto my-2 font-mono text-[10px] text-muted-foreground">
                          <code {...props} />
                        </pre>
                      ),
                    a: ({ ...props }) => (
                      <a
                        className="text-primary hover:underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                  }}
                >
                  {bio}
                </ReactMarkdown>
              ) : (
                <p className="italic text-muted-foreground/60 text-xs">
                  Nothing to preview. Start writing in the edit tab.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your public-facing details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <DialogTitle className="text-md font-bold">
              Confirm Account Changes
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Please enter your current password to authorize changes to your
              email.
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
        aspectRatio={
          cropType === "banner" ? 3 : cropType === "background" ? 5 : 1
        }
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
};
