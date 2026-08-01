"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Image as ImageIcon } from "lucide-react";

export interface RrSubmissionAssetsTabProps {
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onImageUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "coverImage" | "bannerImage" | "backgroundImage",
  ) => void;
  isUploadingCover: boolean;
  isUploadingBanner: boolean;
  isUploadingBackground?: boolean;
}

export function RrSubmissionAssetsTab({
  formData,
  onChange,
  onImageUpload,
  isUploadingCover,
  isUploadingBanner,
  isUploadingBackground = false,
}: RrSubmissionAssetsTabProps): React.JSX.Element {
  return (
    <div className="space-y-5 m-0">
      {/* Cover Image */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="size-4 text-primary" />
          Cover Image (Poster / Front Cover)
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Paste external cover image URL (https://...)"
            value={formData.coverImage || ""}
            onChange={(e) => onChange("coverImage", e.target.value)}
            className="flex-1 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 rounded-xl border-border/70 font-bold"
              disabled={isUploadingCover}
            >
              {isUploadingCover ? (
                <Spinner className="size-3.5" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload File
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onImageUpload(e, "coverImage")}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {formData.coverImage && (
          <div className="mt-3 w-32 h-44 rounded-2xl overflow-hidden border border-border/60 shadow-lg relative group">
            <img
              src={formData.coverImage}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Banner Image */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="size-4 text-primary" />
          Banner Image (Header / Wide Landscape)
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Paste external banner image URL (https://...)"
            value={formData.bannerImage || ""}
            onChange={(e) => onChange("bannerImage", e.target.value)}
            className="flex-1 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 rounded-xl border-border/70 font-bold"
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? (
                <Spinner className="size-3.5" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload File
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onImageUpload(e, "bannerImage")}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {formData.bannerImage && (
          <div className="mt-3 w-full h-32 rounded-2xl overflow-hidden border border-border/60 shadow-lg relative group">
            <img
              src={formData.bannerImage}
              alt="Banner preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Background Image */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ImageIcon className="size-4 text-primary" />
          Background Image (Fanart / Wallpaper)
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Paste background image URL (https://...)"
            value={formData.backgroundImage || ""}
            onChange={(e) => onChange("backgroundImage", e.target.value)}
            className="flex-1 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-10 rounded-xl border-border/70 font-bold"
              disabled={isUploadingBackground}
            >
              {isUploadingBackground ? (
                <Spinner className="size-3.5" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload File
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onImageUpload(e, "backgroundImage")}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {formData.backgroundImage && (
          <div className="mt-3 w-full h-36 rounded-2xl overflow-hidden border border-border/60 shadow-lg relative group">
            <img
              src={formData.backgroundImage}
              alt="Background preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
