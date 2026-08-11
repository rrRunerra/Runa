"use client";

import React, { useState, useRef, useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ArrowRight,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MediaType } from "@/types/aquila";
import { hasPermission, AquilaFlags, RunaFlags } from "@runa/permissions";
import { fetcher } from "@/lib/fetcher";
import {
  RrMediaRecommendationModal,
  RecommendationEntity,
} from "./rrMediaRecommendationModal";

export interface PaginatedRecommendationsEntity {
  data: RecommendationEntity[];
  pageInfo: {
    count: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  userRecommendation?: RecommendationEntity | null;
}

export interface RrMediaRecommendationsProps {
  mediaType: MediaType;
  mediaId: number;
}

function getMediaHref(type: MediaType | string, id: number | string): string {
  const t = String(type).toLowerCase();
  switch (t) {
    case "anime":
      return `/aquila/anime/${id}`;
    case "manga":
      return `/aquila/manga/${id}`;
    case "tv":
      return `/aquila/tv/${id}`;
    case "movie":
      return `/aquila/movies/${id}`;
    case "game":
      return `/aquila/games/${id}`;
    case "book":
      return `/aquila/books/${id}`;
    default:
      return `/aquila/${t}/${id}`;
  }
}

export function RrMediaRecommendations({
  mediaType,
  mediaId,
}: RrMediaRecommendationsProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecommendation, setEditingRecommendation] =
    useState<RecommendationEntity | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const canManageAny =
    hasPermission(session?.user?.permissions, (AquilaFlags as any).MANAGE_RECOMMENDATIONS) ||
    hasPermission(session?.user?.permissions, AquilaFlags.MANAGE) ||
    hasPermission(session?.user?.permissions, RunaFlags.ADMINISTRATOR);

  const getKey = (
    pageIndex: number,
    previousPageData: PaginatedRecommendationsEntity | null,
  ) => {
    if (previousPageData && !previousPageData.pageInfo.hasMore) return null;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let url = `${apiBase}/recommendations?mediaType=${mediaType}&mediaId=${mediaId}&take=10`;
    if (previousPageData?.pageInfo?.nextCursor) {
      url += `&cursor=${previousPageData.pageInfo.nextCursor}`;
    }
    return session?.accessToken ? [url, session.accessToken] : url;
  };

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<PaginatedRecommendationsEntity>(getKey, fetcher);

  const allRecommendations: RecommendationEntity[] = data
    ? data.flatMap((page) => page.data || [])
    : [];

  const userRecommendation: RecommendationEntity | null | undefined =
    data?.[0]?.userRecommendation;
  const hasMore = Boolean(data?.[data.length - 1]?.pageInfo?.hasMore);
  const totalCount = data?.[0]?.pageInfo?.count ?? allRecommendations.length;

  const filteredList = userRecommendation
    ? allRecommendations.filter((r) => r.id !== userRecommendation.id)
    : allRecommendations;

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
    setEditingRecommendation(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (recommendation: RecommendationEntity) => {
    setEditingRecommendation(recommendation);
    setIsModalOpen(true);
  };

  const handleDeleteRecommendation = async (recommendation: RecommendationEntity) => {
    if (!confirm(t("aquila.deleteRecommendationConfirm"))) return;

    setDeletingId(recommendation.id);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const url = `${apiBase}/recommendations/${recommendation.id}`;

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
        toast.success(t("aquila.deleteRecommendation"));
        mutate();
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.message || "Failed to delete recommendation.");
      }
    } catch {
      toast.error("Failed to delete recommendation.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleVote = async (
    recommendation: RecommendationEntity,
    targetVote: "UPVOTE" | "DOWNVOTE",
  ) => {
    if (!session?.user) {
      toast.error("Please sign in to vote on recommendations.");
      return;
    }

    setVotingId(recommendation.id);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const url = `${apiBase}/recommendations/${recommendation.id}/vote`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    // Optimistic Update
    const currentVote = recommendation.userVote;
    let newVote: "UPVOTE" | "DOWNVOTE" | null = targetVote;
    let deltaUpvotes = 0;
    let deltaDownvotes = 0;

    if (targetVote === "UPVOTE") {
      if (currentVote === "UPVOTE") {
        newVote = null;
        deltaUpvotes = -1;
      } else if (currentVote === "DOWNVOTE") {
        newVote = "UPVOTE";
        deltaUpvotes = 1;
        deltaDownvotes = -1;
      } else {
        newVote = "UPVOTE";
        deltaUpvotes = 1;
      }
    } else {
      if (currentVote === "DOWNVOTE") {
        newVote = null;
        deltaDownvotes = -1;
      } else if (currentVote === "UPVOTE") {
        newVote = "DOWNVOTE";
        deltaDownvotes = 1;
        deltaUpvotes = -1;
      } else {
        newVote = "DOWNVOTE";
        deltaDownvotes = 1;
      }
    }

    const optimisticData = data?.map((page) => ({
      ...page,
      data: page.data.map((item) => {
        if (item.id === recommendation.id) {
          return {
            ...item,
            upvotes: item.upvotes + deltaUpvotes,
            downvotes: item.downvotes + deltaDownvotes,
            score: item.score + deltaUpvotes - deltaDownvotes,
            userVote: newVote,
          };
        }
        return item;
      }),
      userRecommendation:
        page.userRecommendation?.id === recommendation.id
          ? {
              ...page.userRecommendation,
              upvotes: page.userRecommendation.upvotes + deltaUpvotes,
              downvotes: page.userRecommendation.downvotes + deltaDownvotes,
              score: page.userRecommendation.score + deltaUpvotes - deltaDownvotes,
              userVote: newVote,
            }
          : page.userRecommendation,
    }));

    mutate(
      async () => {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ voteType: targetVote }),
        });
        if (!res.ok) {
          throw new Error("Failed to vote.");
        }
        return mutate();
      },
      {
        optimisticData,
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    ).catch(() => {
      toast.error("Failed to vote.");
    }).finally(() => {
      setVotingId(null);
    });
  };

  const toggleReasonExpand = (id: number) => {
    setExpandedReasons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 outline-none">
      {/* Header Bar */}
      <div className="flex flex-row items-center justify-between gap-3 p-4 sm:p-6 rounded-3xl bg-card/60 border border-border/30 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="size-10 sm:size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Sparkles className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2 truncate">
              <span>{t("aquila.recommendations")}</span>
              <Badge
                variant="secondary"
                className="rounded-xl px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold shrink-0"
              >
                {totalCount}
              </Badge>
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
              Community recommended media
            </p>
          </div>
        </div>

        {session?.user && !userRecommendation && (
          <Button
            onClick={handleOpenCreateModal}
            size="default"
            className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl font-bold text-xs sm:text-sm gap-1.5 sm:gap-2 cursor-pointer shadow-md hover:scale-[1.02] transition-all shrink-0"
          >
            <Plus className="size-3.5 sm:size-4" />
            <span>{t("aquila.recommendMedia")}</span>
          </Button>
        )}
      </div>

      {/* User's Own Recommendation (Pinned) */}
      {userRecommendation && (
        <div className="p-5 sm:p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-primary text-primary-foreground font-bold text-xs rounded-lg px-2.5 py-0.5">
                {t("aquila.yourRecommendation")}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-extrabold uppercase rounded-md px-2 py-0.5 border-border/40">
                {mediaType} → {userRecommendation.recommendedMedia.type}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {new Date(userRecommendation.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={`font-extrabold text-xs rounded-xl px-3 py-1 ${
                  userRecommendation.score > 0
                    ? "text-primary bg-primary/10"
                    : userRecommendation.score < 0
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground"
                }`}
              >
                {userRecommendation.score > 0 ? `+${userRecommendation.score}` : userRecommendation.score}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleOpenEditModal(userRecommendation)}
                className="size-9 rounded-xl cursor-pointer hover:bg-accent/20"
                title={t("aquila.editRecommendation")}
              >
                <Edit2 className="size-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDeleteRecommendation(userRecommendation)}
                disabled={deletingId === userRecommendation.id}
                className="size-9 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive"
                title={t("aquila.deleteRecommendation")}
              >
                {deletingId === userRecommendation.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Media Link Card */}
          <Link
            href={getMediaHref(
              userRecommendation.recommendedMedia.type,
              userRecommendation.recommendedMedia.id,
            )}
            className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-card/80 border border-border/30 hover:border-primary/40 hover:bg-card transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative size-14 sm:size-16 rounded-xl overflow-hidden bg-muted/60 shrink-0 border border-border/40">
                {userRecommendation.recommendedMedia.coverImage ? (
                  <Image
                    src={userRecommendation.recommendedMedia.coverImage}
                    alt={userRecommendation.recommendedMedia.titlePrimary}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="64px"
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
                  className="text-[9px] font-extrabold uppercase rounded px-1.5 py-0 mb-1"
                >
                  {userRecommendation.recommendedMedia.type}
                </Badge>
                <h4 className="text-sm sm:text-base font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                  {userRecommendation.recommendedMedia.titlePrimary}
                </h4>
                {userRecommendation.recommendedMedia.titleSecondary && (
                  <p className="text-xs text-muted-foreground truncate">
                    {userRecommendation.recommendedMedia.titleSecondary}
                  </p>
                )}
              </div>
            </div>

            <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </Link>

          {userRecommendation.body && (
            <div className="space-y-1">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {userRecommendation.body}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feed List */}
      {isLoading && allRecommendations.length === 0 ? (
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
              <div className="h-16 w-full bg-muted/50 rounded-2xl" />
              <div className="h-12 w-3/4 bg-muted/30 rounded" />
            </div>
          ))}
        </div>
      ) : filteredList.length === 0 && !userRecommendation ? (
        <div className="text-center py-16 p-8 rounded-3xl bg-card/30 border border-border/20 space-y-4">
          <Sparkles className="size-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            {t("aquila.noRecommendations")}
          </p>
          <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
            {t("aquila.noRecommendationsDesc")}
          </p>
          {session?.user && (
            <Button
              onClick={handleOpenCreateModal}
              size="default"
              variant="outline"
              className="h-10 px-5 rounded-xl text-xs font-bold cursor-pointer mt-2"
            >
              {t("aquila.recommendMedia")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((rec) => {
            const isOwner = session?.user?.id === rec.userId;
            const canDelete = isOwner || canManageAny;
            const isReasonExpanded = Boolean(expandedReasons[rec.id]);
            const isLongReason = (rec.body?.length || 0) > 280;

            return (
              <div
                key={rec.id}
                className="p-5 sm:p-6 rounded-3xl bg-card/60 border border-border/30 backdrop-blur-xl space-y-4 shadow-sm hover:shadow-md transition-all"
              >
                {/* Top Author & Actions Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {rec.user?.avatarUrl ? (
                      <Image
                        src={rec.user.avatarUrl}
                        alt={rec.user.displayName || rec.user.username}
                        width={40}
                        height={40}
                        className="rounded-full object-cover size-10 border border-border/40 shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {rec.user?.username ? rec.user.username.slice(0, 2).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate">
                          {rec.user?.displayName || rec.user?.username || "Anonymous"}
                        </span>
                        {rec.user?.username && (
                          <span className="text-xs text-muted-foreground truncate">
                            @{rec.user.username}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] font-extrabold uppercase rounded px-1.5 py-0 border-border/40">
                          {mediaType} → {rec.recommendedMedia.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteRecommendation(rec)}
                        disabled={deletingId === rec.id}
                        className="size-8 rounded-xl cursor-pointer hover:bg-destructive/10 text-destructive"
                        title={t("aquila.deleteRecommendation")}
                      >
                        {deletingId === rec.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recommended Target Media Card */}
                <Link
                  href={getMediaHref(
                    rec.recommendedMedia.type,
                    rec.recommendedMedia.id,
                  )}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-card/80 border border-border/30 hover:border-primary/40 hover:bg-card transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative size-14 sm:size-16 rounded-xl overflow-hidden bg-muted/60 shrink-0 border border-border/40">
                      {rec.recommendedMedia.coverImage ? (
                        <Image
                          src={rec.recommendedMedia.coverImage}
                          alt={rec.recommendedMedia.titlePrimary}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="64px"
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
                        className="text-[9px] font-extrabold uppercase rounded px-1.5 py-0 mb-1"
                      >
                        {rec.recommendedMedia.type}
                      </Badge>
                      <h4 className="text-sm sm:text-base font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                        {rec.recommendedMedia.titlePrimary}
                      </h4>
                      {rec.recommendedMedia.titleSecondary && (
                        <p className="text-xs text-muted-foreground truncate">
                          {rec.recommendedMedia.titleSecondary}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="size-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                </Link>

                {/* Recommendation Reason Body */}
                {rec.body && (
                  <div className="space-y-1.5">
                    <p
                      className={`text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed ${
                        !isReasonExpanded && isLongReason ? "line-clamp-3" : ""
                      }`}
                    >
                      {rec.body}
                    </p>
                    {isLongReason && (
                      <button
                        type="button"
                        onClick={() => toggleReasonExpand(rec.id)}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer pt-1"
                      >
                        {isReasonExpanded ? (
                          <>
                            <span>Show Less</span>
                            <ChevronUp className="size-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Read Full Note</span>
                            <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom Upvote/Downvote Ranking Action */}
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <div className="flex items-center gap-1.5 bg-card/80 border border-border/40 p-1 rounded-2xl shadow-inner">
                    {/* Upvote Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(rec, "UPVOTE")}
                      disabled={votingId === rec.id}
                      className={`rounded-xl h-8 px-3 gap-1.5 font-extrabold text-xs cursor-pointer transition-all ${
                        rec.userVote === "UPVOTE"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ThumbsUp className="size-3.5" />
                      <span>{rec.upvotes}</span>
                    </Button>

                    {/* Net Score Display */}
                    <div
                      className={`px-2 text-xs font-black select-none ${
                        rec.score > 0
                          ? "text-primary"
                          : rec.score < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {rec.score > 0 ? `+${rec.score}` : rec.score}
                    </div>

                    {/* Downvote Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(rec, "DOWNVOTE")}
                      disabled={votingId === rec.id}
                      className={`rounded-xl h-8 px-3 gap-1.5 font-extrabold text-xs cursor-pointer transition-all ${
                        rec.userVote === "DOWNVOTE"
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                          : "hover:bg-accent/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ThumbsDown className="size-3.5" />
                      <span>{rec.downvotes}</span>
                    </Button>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-semibold">
                    {rec.upvotes + rec.downvotes} {rec.upvotes + rec.downvotes === 1 ? "vote" : "votes"}
                  </span>
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
            <span>{t("aquila.loadMoreRecommendations")}</span>
          </div>
        )}
      </div>

      {/* Recommendation Form Modal */}
      <RrMediaRecommendationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceType={mediaType}
        sourceId={mediaId}
        existingRecommendation={editingRecommendation}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
