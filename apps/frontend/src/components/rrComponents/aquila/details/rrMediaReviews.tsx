"use client";

import React, { useState, useRef, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import {
  MessageSquare,
  Star,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MediaType } from "@/types/aquila";
import { hasPermission, AquilaFlags, RunaFlags } from "@runa/permissions";
import { fetcher } from "@/lib/fetcher";
import { RrMediaReviewFormModal, ReviewEntity } from "./rrMediaReviewFormModal";

export interface PaginatedReviewsEntity {
  data: ReviewEntity[];
  pageInfo: {
    count: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  userReview?: ReviewEntity | null;
}

export interface RrMediaReviewsProps {
  mediaType: MediaType;
  mediaId: number;
}

export function RrMediaReviews({
  mediaType,
  mediaId,
}: RrMediaReviewsProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ReviewEntity | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<number, boolean>
  >({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Check moderator/admin permissions
  const canManageAny =
    hasPermission(session?.user?.permissions, AquilaFlags.MANAGE_REVIEWS) ||
    hasPermission(session?.user?.permissions, AquilaFlags.MANAGE) ||
    hasPermission(session?.user?.permissions, RunaFlags.ADMINISTRATOR);

  const getKey = (
    pageIndex: number,
    previousPageData: PaginatedReviewsEntity | null,
  ) => {
    if (previousPageData && !previousPageData.pageInfo.hasMore) return null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let url = `${apiBase}/reviews?mediaType=${mediaType}&mediaId=${mediaId}&take=10`;
    if (previousPageData?.pageInfo?.nextCursor) {
      url += `&cursor=${previousPageData.pageInfo.nextCursor}`;
    }
    return session?.accessToken ? [url, session.accessToken] : url;
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<PaginatedReviewsEntity>(getKey, fetcher);

  // Flatten all review data
  const allReviews: ReviewEntity[] = data
    ? data.flatMap((page) => page.data || [])
    : [];

  const userReview: ReviewEntity | null | undefined = data?.[0]?.userReview;
  const hasMore = Boolean(data?.[data.length - 1]?.pageInfo?.hasMore);

  // Deduplicate userReview from list if returned in general array
  const filteredList = userReview
    ? allReviews.filter((r) => r.id !== userReview.id)
    : allReviews;

  // Calculate average rating
  const totalItems = (userReview ? 1 : 0) + filteredList.length;
  const avgScore =
    totalItems > 0
      ? (
          ((userReview ? userReview.score : 0) +
            filteredList.reduce((acc, r) => acc + r.score, 0)) /
          totalItems
        ).toFixed(1)
      : null;

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isValidating) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isValidating) {
          setSize((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isValidating, setSize]);

  const handleOpenCreateModal = () => {
    setEditingReview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (review: ReviewEntity) => {
    setEditingReview(review);
    setIsModalOpen(true);
  };

  const handleDeleteReview = async (review: ReviewEntity) => {
    if (!confirm(t("aquila.deleteReviewConfirm"))) return;

    setDeletingId(review.id);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const url = `${apiBase}/reviews/${review.id}?mediaType=${mediaType}`;

    const headers: HeadersInit = {};
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast.success(t("aquila.deleteReview"));
        mutate();
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.message || "Failed to delete review.");
      }
    } catch (e: unknown) {
      toast.error("Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSpoiler = (id: number) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 outline-none">
      {/* Header Statistics & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card/60 border border-border/30 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2.5">
              {t("aquila.reviews")}
              {avgScore && (
                <Badge
                  variant="secondary"
                  className="gap-1 rounded-xl px-3 py-1 text-xs font-bold"
                >
                  <Star className="size-3.5 text-amber-400 fill-amber-400" />
                  {avgScore} / 10
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              {totalItems} {totalItems === 1 ? "review" : "reviews"} submitted
            </p>
          </div>
        </div>

        {session?.user && !userReview && (
          <Button
            onClick={handleOpenCreateModal}
            size="default"
            className="h-11 px-5 rounded-xl font-bold text-sm gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-all"
          >
            <Plus className="size-4" />
            {t("aquila.writeReview")}
          </Button>
        )}
      </div>

      {/* User's Own Review (Pinned Top) */}
      {userReview && (
        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-primary text-primary-foreground font-bold text-xs rounded-lg px-2.5 py-0.5">
                {t("aquila.yourReview")}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(userReview.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 rounded-xl px-3 py-1 text-xs font-extrabold bg-card border-border/40"
              >
                <Star className="size-3.5 text-amber-400 fill-amber-400" />
                {userReview.score} / 10
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleOpenEditModal(userReview)}
                className="size-9 rounded-xl cursor-pointer hover:bg-accent/20"
                title={t("aquila.editReview")}
              >
                <Edit2 className="size-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDeleteReview(userReview)}
                disabled={deletingId === userReview.id}
                className="size-9 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive"
                title={t("aquila.deleteReview")}
              >
                {deletingId === userReview.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-base font-extrabold text-foreground">
              {userReview.summary}
            </h4>
            <p className="text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
              {userReview.body}
            </p>
          </div>
        </div>
      )}

      {/* Review List */}
      {isLoading && allReviews.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-card/40 border border-border/20 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted/60" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-muted/60 rounded" />
                  <div className="h-2.5 w-20 bg-muted/40 rounded" />
                </div>
              </div>
              <div className="h-5 w-3/4 bg-muted/60 rounded" />
              <div className="h-16 w-full bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 && !userReview ? (
        <div className="text-center py-16 p-8 rounded-3xl bg-card/30 border border-border/20 space-y-4">
          <MessageSquare className="size-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            {t("aquila.noReviews")}
          </p>
          {session?.user && (
            <Button
              onClick={handleOpenCreateModal}
              size="default"
              variant="outline"
              className="h-10 px-5 rounded-xl text-xs font-bold cursor-pointer"
            >
              {t("aquila.writeReview")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((review) => {
            const isOwner =
              session?.user?.name?.toLowerCase() ===
                review.username.toLowerCase() ||
              session?.user?.email?.split("@")[0].toLowerCase() ===
                review.username.toLowerCase();
            const canDelete = isOwner || canManageAny;
            const isSpoilerRevealed = Boolean(revealedSpoilers[review.id]);

            return (
              <div
                key={review.id}
                className="p-6 rounded-3xl bg-card/60 border border-border/30 backdrop-blur-xl space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {review.user?.avatarUrl ? (
                      <Image
                        src={review.user.avatarUrl}
                        alt={review.user.displayName || review.username}
                        width={40}
                        height={40}
                        className="rounded-full object-cover size-10 border border-border/40"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {review.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {review.user?.displayName || review.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{review.username}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-xl px-3 py-1 text-xs font-extrabold bg-background/60 border-border/40"
                    >
                      <Star className="size-3.5 text-amber-400 fill-amber-400" />
                      {review.score} / 10
                    </Badge>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteReview(review)}
                        disabled={deletingId === review.id}
                        className="size-9 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive"
                        title={t("aquila.deleteReview")}
                      >
                        {deletingId === review.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Review Headline & Body */}
                <div className="space-y-2">
                  <h4 className="text-base font-extrabold text-foreground">
                    {review.summary}
                  </h4>

                  {review.isSpoiler && !isSpoilerRevealed ? (
                    <div className="mt-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>{t("aquila.spoilerWarning")}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSpoiler(review.id)}
                        className="rounded-xl text-xs h-8 px-3.5 gap-1.5 cursor-pointer bg-card font-semibold"
                      >
                        <Eye className="size-3.5" />
                        {t("aquila.showSpoiler")}
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {review.body}
                      </p>
                      {review.isSpoiler && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSpoiler(review.id)}
                          className="mt-2.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2.5 gap-1.5 cursor-pointer rounded-lg"
                        >
                          <EyeOff className="size-3.5" />
                          {t("aquila.hideSpoiler")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="py-4 text-center">
        {isValidating && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>{t("aquila.loadMoreReviews")}</span>
          </div>
        )}
      </div>

      {/* Write/Edit Review Modal */}
      <RrMediaReviewFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mediaType={mediaType}
        mediaId={mediaId}
        existingReview={editingReview}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
