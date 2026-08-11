"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  Check,
  Film,
  Tv,
  BookOpen,
  Gamepad2,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { MediaType } from "@/types/aquila";

export interface SelectedTargetMedia {
  id: number;
  type: MediaType;
  titlePrimary: string;
  titleSecondary?: string | null;
  coverImage?: string | null;
}

export interface RecommendationEntity {
  id: number;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  sourceType: MediaType;
  sourceId: number;
  targetType: MediaType;
  targetId: number;
  recommendedMedia: SelectedTargetMedia;
  body: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: "UPVOTE" | "DOWNVOTE" | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RrMediaRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: MediaType;
  sourceId: number;
  existingRecommendation?: RecommendationEntity | null;
  onSuccess: () => void;
}

const MEDIA_TYPE_TABS: { type: MediaType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: MediaType.ANIME, label: "Anime", icon: Sparkles },
  { type: MediaType.MANGA, label: "Manga", icon: BookOpen },
  { type: MediaType.TV, label: "TV", icon: Tv },
  { type: MediaType.MOVIE, label: "Movie", icon: Film },
  { type: MediaType.GAME, label: "Game", icon: Gamepad2 },
  { type: MediaType.BOOK, label: "Book", icon: BookOpen },
];

export function RrMediaRecommendationModal({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  existingRecommendation,
  onSuccess,
}: RrMediaRecommendationModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<MediaType>(MediaType.ANIME);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SelectedTargetMedia[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTargetMedia | null>(null);
  const [body, setBody] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize editing mode or reset state on open
  useEffect(() => {
    if (existingRecommendation) {
      setSelectedTarget(existingRecommendation.recommendedMedia);
      setBody(existingRecommendation.body || "");
      setActiveTab(existingRecommendation.recommendedMedia.type);
    } else {
      setSelectedTarget(null);
      setBody("");
      setSearchQuery("");
      setSearchResults([]);
      setActiveTab(MediaType.ANIME);
    }
    setErrorMsg(null);
  }, [existingRecommendation, isOpen]);

  // Debounced search query
  useEffect(() => {
    if (existingRecommendation || selectedTarget || !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const routePrefix = activeTab.toLowerCase() === "movie" ? "movie" : activeTab.toLowerCase();
      const url = `${apiBase}/${routePrefix}/search/${encodeURIComponent(trimmed)}`;

      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped: SelectedTargetMedia[] = data
              .filter((item: any) => !(activeTab === sourceType && Number(item.id) === sourceId))
              .slice(0, 10)
              .map((item: any) => ({
                id: Number(item.id),
                type: activeTab,
                titlePrimary: item.titlePrimary || item.title || item.name || "Unknown",
                titleSecondary: item.titleSecondary || item.secondaryTitle || null,
                coverImage: item.coverImage || item.image || item.posterImage || null,
              }));
            setSearchResults(mapped);
          } else {
            setSearchResults([]);
          }
        }
      } catch (err) {
        console.error("Search media error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, existingRecommendation, selectedTarget, sourceType, sourceId]);

  const handleSubmit = async () => {
    if (!selectedTarget && !existingRecommendation) {
      setErrorMsg(t("aquila.selectTargetMedia"));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    try {
      if (existingRecommendation) {
        // Edit recommendation
        const res = await fetch(`${apiBase}/recommendations/${existingRecommendation.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            body: body.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || "Failed to update recommendation.");
        }

        toast.success(t("aquila.editRecommendation"));
        onSuccess();
        onClose();
      } else {
        // Create recommendation
        const res = await fetch(`${apiBase}/recommendations`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            sourceType,
            sourceId,
            targetType: selectedTarget!.type,
            targetId: selectedTarget!.id,
            body: body.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || "Failed to submit recommendation.");
        }

        toast.success(t("aquila.submitRecommendation"));
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl bg-card border-border/40 backdrop-blur-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/20">
          <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2.5">
            <Sparkles className="size-5 text-primary shrink-0" />
            <span>
              {existingRecommendation
                ? t("aquila.editRecommendation")
                : t("aquila.recommendMedia")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            {existingRecommendation
              ? t("aquila.recommendationReason")
              : t("aquila.noRecommendationsDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* If Creating: Select Target Media Section */}
          {!existingRecommendation && (
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground">
                {t("aquila.selectTargetMedia")}
              </Label>

              {selectedTarget ? (
                /* Selected Preview Card */
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/5 border border-primary/25 shadow-sm">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative size-14 rounded-xl overflow-hidden bg-muted/60 shrink-0 border border-border/40">
                      {selectedTarget.coverImage ? (
                        <Image
                          src={selectedTarget.coverImage}
                          alt={selectedTarget.titlePrimary}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Sparkles className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-extrabold uppercase rounded-md px-1.5 py-0"
                        >
                          {selectedTarget.type}
                        </Badge>
                        <span className="text-xs font-bold text-primary flex items-center gap-1">
                          <Check className="size-3.5" />
                          Selected
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {selectedTarget.titlePrimary}
                      </h4>
                      {selectedTarget.titleSecondary && (
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedTarget.titleSecondary}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTarget(null);
                      setSearchQuery("");
                    }}
                    className="rounded-xl text-xs h-8 px-3 gap-1.5 font-semibold cursor-pointer shrink-0"
                  >
                    <RotateCcw className="size-3.5" />
                    Change
                  </Button>
                </div>
              ) : (
                /* Search & Selector Tabs */
                <div className="space-y-3">
                  {/* Media Type Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {MEDIA_TYPE_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.type;
                      return (
                        <Button
                          key={tab.type}
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setActiveTab(tab.type);
                            setSearchResults([]);
                          }}
                          className={`rounded-xl text-xs h-8 px-3 gap-1.5 font-bold cursor-pointer transition-all shrink-0 ${
                            isActive ? "shadow-md scale-102" : "border-border/40 bg-card/60"
                          }`}
                        >
                          <Icon className="size-3.5" />
                          {tab.label}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("aquila.searchMediaToRecommend")}
                      className="pl-10 h-11 rounded-2xl bg-card border-border/40 text-xs font-medium focus-visible:ring-primary/40"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-primary" />
                    )}
                  </div>

                  {/* Search Results Dropdown / List */}
                  {searchResults.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-1.5 rounded-2xl bg-card border border-border/40 shadow-lg scrollbar-none">
                      {searchResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedTarget(item)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/20 cursor-pointer transition-all group"
                        >
                          <div className="relative size-11 rounded-lg overflow-hidden bg-muted/60 shrink-0 border border-border/40">
                            {item.coverImage ? (
                              <Image
                                src={item.coverImage}
                                alt={item.titlePrimary}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                ?
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Badge
                                variant="outline"
                                className="text-[9px] font-extrabold uppercase rounded px-1 py-0"
                              >
                                {item.type}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {item.titlePrimary}
                            </p>
                            {item.titleSecondary && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {item.titleSecondary}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mr-1" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* If Editing: Show Current Target Display */}
          {existingRecommendation && selectedTarget && (
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card/60 border border-border/30">
              <div className="relative size-14 rounded-xl overflow-hidden bg-muted/60 shrink-0 border border-border/40">
                {selectedTarget.coverImage ? (
                  <Image
                    src={selectedTarget.coverImage}
                    alt={selectedTarget.titlePrimary}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Sparkles className="size-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-extrabold uppercase rounded-md px-1.5 py-0 mb-1"
                >
                  {selectedTarget.type}
                </Badge>
                <h4 className="text-sm font-bold text-foreground truncate">
                  {selectedTarget.titlePrimary}
                </h4>
              </div>
            </div>
          )}

          {/* Reasoning / Body Textarea */}
          <div className="space-y-2">
            <Label htmlFor="recommendation-reason" className="text-xs font-bold text-foreground">
              {t("aquila.recommendationReason")}
            </Label>
            <Textarea
              id="recommendation-reason"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("aquila.recommendationReasonPlaceholder")}
              rows={5}
              maxLength={5000}
              className="rounded-2xl bg-card border-border/40 text-xs font-normal resize-none focus-visible:ring-primary/40 leading-relaxed"
            />
            <div className="text-right text-[10px] text-muted-foreground font-medium">
              {body.length} / 5000
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-border/20 bg-muted/10 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-bold h-10 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedTarget && !existingRecommendation)}
            className="rounded-xl text-xs font-bold h-10 px-5 gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>
              {existingRecommendation
                ? t("aquila.editRecommendation")
                : t("aquila.submitRecommendation")}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
