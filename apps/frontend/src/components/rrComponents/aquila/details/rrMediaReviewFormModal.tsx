"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
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
import { Switch } from "@/components/ui/switch";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { MediaType } from "@/types/aquila";

export interface ReviewEntity {
  id: number;
  username: string;
  mediaType: MediaType;
  mediaId: number;
  summary: string;
  body: string;
  score: number;
  upvotes: number;
  isSpoiler: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface RrMediaReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: MediaType;
  mediaId: number;
  existingReview?: ReviewEntity | null;
  onSuccess: () => void;
}

export function RrMediaReviewFormModal({
  isOpen,
  onClose,
  mediaType,
  mediaId,
  existingReview,
  onSuccess,
}: RrMediaReviewFormModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [score, setScore] = useState<number>(10);
  const [summary, setSummary] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingReview) {
      setScore(existingReview.score);
      setSummary(existingReview.summary);
      setBody(existingReview.body);
      setIsSpoiler(existingReview.isSpoiler);
    } else {
      setScore(10);
      setSummary("");
      setBody("");
      setIsSpoiler(false);
    }
    setErrorMsg(null);
  }, [existingReview, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !body.trim()) {
      setErrorMsg("Summary and body are required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const isEdit = Boolean(existingReview);
    const url = isEdit
      ? `${apiBase}/reviews/${existingReview!.id}`
      : `${apiBase}/reviews`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    const payload = isEdit
      ? { mediaType, summary: summary.trim(), body: body.trim(), score, isSpoiler }
      : { mediaType, mediaId, summary: summary.trim(), body: body.trim(), score, isSpoiler };

    try {
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(
          isEdit ? t("aquila.updateReview") : t("aquila.submitReview"),
        );
        onSuccess();
        onClose();
      } else {
        const errJson = await res.json().catch(() => null);
        const msg = errJson?.message || "Failed to save review.";
        setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "An error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl w-full rounded-3xl bg-card border-border p-7 sm:p-8 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-2xl font-extrabold text-foreground">
            {existingReview ? t("aquila.editReview") : t("aquila.writeReview")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Share your thoughts and rating with the community.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {errorMsg && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3.5 text-xs text-destructive font-medium">
              {errorMsg}
            </div>
          )}

          {/* Rating / Score Selection */}
          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Star className="size-4.5 text-amber-400 fill-amber-400" />
              {t("aquila.score")}: <span className="font-extrabold text-base text-primary">{score} / 10</span>
            </Label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 w-full pt-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant={score === val ? "default" : "outline"}
                  size="sm"
                  className={`h-11 w-full rounded-xl font-bold text-sm cursor-pointer transition-all ${
                    score === val
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-card border-border/40 hover:bg-accent/20"
                  }`}
                  onClick={() => setScore(val)}
                >
                  {val}
                </Button>
              ))}
            </div>
          </div>

          {/* Summary Input */}
          <div className="space-y-2">
            <Label htmlFor="review-summary" className="text-sm font-bold text-foreground">
              {t("aquila.summary")}
            </Label>
            <Input
              id="review-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("aquila.summaryPlaceholder")}
              className="h-11 rounded-xl bg-background/60 border-border/50 text-sm px-4"
              maxLength={150}
              required
            />
          </div>

          {/* Body Textarea */}
          <div className="space-y-2">
            <Label htmlFor="review-body" className="text-sm font-bold text-foreground">
              {t("aquila.reviewBody")}
            </Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("aquila.reviewBodyPlaceholder")}
              className="rounded-xl bg-background/60 border-border/50 text-sm p-4 min-h-[220px] resize-y leading-relaxed"
              required
            />
          </div>

          {/* Spoiler Switch */}
          <div className="flex items-center justify-between rounded-2xl bg-accent/10 p-4 border border-border/30">
            <Label htmlFor="spoiler-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
              {t("aquila.containsSpoilers")}
            </Label>
            <Switch
              id="spoiler-toggle"
              checked={isSpoiler}
              onCheckedChange={setIsSpoiler}
            />
          </div>

          <DialogFooter className="gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-5 rounded-xl cursor-pointer text-xs font-semibold"
            >
              {t("aquila.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !summary.trim() || !body.trim()}
              className="h-11 px-6 rounded-xl cursor-pointer text-xs font-bold gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {existingReview ? t("aquila.updateReview") : t("aquila.submitReview")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
