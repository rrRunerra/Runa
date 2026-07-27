"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Star, Heart, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { fetcher } from "@/lib/fetcher";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { BookEntity } from "@/types/book.entities";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaSimilar } from "@/components/rrComponents/aquila/details/rrMediaSimilar";

import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ListEntry {
  id: number | string;
  status: string;
  score?: number;
  progress?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const formatCompactNumber = (num: number | null | undefined): string => {
  if (num == null || isNaN(num)) return "0";
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

export default function BookDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);

  // SWR queries replacing sequential imperative fetching
  const {
    data: book,
    error: bookError,
    isLoading: bookLoading,
    mutate: mutateBook,
  } = useSWR<BookEntity>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/book/${id}` : null,
    fetcher,
  );

  const { data: listEntry, mutate: mutateListEntry } = useSWR<ListEntry>(
    id && session.status === "authenticated" && session.data?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/book/entry/${id}`,
          session.data.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const hasListEntry = !!listEntry;

  const displayTitle = book?.titleString ?? t("aquila.bookDetails");
  const displaySubtitle = book?.subtitle ?? null;
  const coverUrl = book?.coverImage ?? "";

  const providers = useMemo(() => {
    const list: { name: string; url: string }[] = [];
    if (book?.infoLink) {
      list.push({
        name: "Google Books",
        url: book.infoLink,
      });
    }
    return list;
  }, [book]);

  const formattedPublishedDate = useMemo((): string | null => {
    if (!book?.publishedDate) return null;
    try {
      const date = new Date(book.publishedDate);
      if (isNaN(date.getTime())) return book.publishedDate;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return book.publishedDate;
    }
  }, [book?.publishedDate]);

  const staff = useMemo(() => {
    if (!book) return [];
    const items: any[] = [];
    if (book.authors) {
      book.authors.forEach((author: string, idx: number) => {
        items.push({
          id: `author-${idx}`,
          name: author,
          role: t("aquila.author"),
        });
      });
    }
    if (book.artists) {
      book.artists.forEach((artist: string, idx: number) => {
        items.push({
          id: `artist-${idx}`,
          name: artist,
          role: t("aquila.artist"),
        });
      });
    }
    return items;
  }, [book, t]);

  useEffect((): void => {
    if (!book) return;
    document.title = `Aquila > Book > ${displayTitle}`;
  }, [book, displayTitle]);

  if (bookLoading) {
    return <RrMediaDetailsSkeleton />;
  }

  if (bookError || !book) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.bookNotFound")}
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse?type=books">
            {t("aquila.backToBrowse")}
          </Link>
        </Button>
      </div>
    );
  }

  const handleQuickAdd = async (): Promise<void> => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/book/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.accessToken}`,
          },
          body: JSON.stringify({
            bookId: id,
            status: "PLANNING",
          }),
        },
      );
      if (res.ok) {
        toast.success(t("aquila.addedToList"));
        mutateListEntry();
      } else {
        toast.error(t("aquila.failedAddToList"));
      }
    } catch {
      toast.error(t("aquila.failedAddToList"));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] -left-25 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section */}
      <div className="relative h-60 md:h-90 w-full overflow-hidden shrink-0 z-10">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent z-10" />
        <div className="w-full h-full bg-muted/10" />
      </div>

      {/* Details layout container */}
      <div className="px-4 md:px-8 pb-16 -mt-16 md:-mt-24 relative z-20 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8 w-full"
        >
          {/* Left Column - Cover & Main Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-65 flex flex-col gap-4"
          >
            <div className="flex flex-row lg:flex-col gap-4 items-end lg:items-stretch lg:bg-card/75 lg:border lg:border-border/40 lg:backdrop-blur-xl lg:shadow-2xl lg:rounded-2xl lg:p-4">
              <div className="relative aspect-2/3 w-28 sm:w-36 lg:w-full rounded-xl overflow-hidden shadow-2xl border border-border/40 shrink-0 bg-card flex items-center justify-center">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 260px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2.5 w-full justify-end lg:justify-center mb-1 lg:mb-0">
                {session.status === "authenticated" && session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer rounded-xl transition-all shadow-md font-semibold"
                          size="default"
                          onClick={handleQuickAdd}
                        >
                          {t("aquila.quickAdd")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl bg-card/80 backdrop-blur-sm"
                          size="default"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          {t("aquila.addToList")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl font-semibold"
                        size="default"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        {t("aquila.editEntry")}
                      </Button>
                    )}
                    <RrMediaEditDialog
                      media={{
                        id: book.id.toString(),
                        type: "book",
                        title: { english: displayTitle, romaji: displayTitle },
                        coverImage: { large: coverUrl },
                      }}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={(): void => {
                        mutateListEntry();
                      }}
                      onDeleted={(): void => {
                        mutateListEntry();
                      }}
                    />
                    <RrMediaRefreshButton
                      mediaType="book"
                      mediaId={book.id.toString()}
                      onRefreshed={(): void => {
                        void mutateBook();
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Mobile Header / Title */}
            <div className="space-y-1 lg:hidden mt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {displaySubtitle && displaySubtitle !== displayTitle && (
                <p className="text-sm text-muted-foreground font-semibold">
                  {displaySubtitle}
                </p>
              )}
            </div>

            {/* Media Metadata Stats Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              {/* Top Key Stats Block */}
              <div className="space-y-2.5">
                {/* Average Score Card (Full Width) */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 transition-all shadow-xs">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                    <Star className="size-5 fill-primary/40" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {t("aquila.averageScore")}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-primary leading-none">
                        {book.localAverageScore
                          ? book.localAverageScore.toFixed(1)
                          : book.averageRating
                            ? book.averageRating.toFixed(1)
                            : "N/A"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        / 10
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorites & Popularity (2 Columns) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Favorites */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                      <Heart className="size-4 fill-rose-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-rose-500/90 uppercase tracking-wider truncate">
                        {t("aquila.favorites")}
                      </span>
                      <span
                        className="text-base font-extrabold text-foreground tracking-tight leading-none mt-0.5"
                        title={
                          book.localFavoritesCount != null
                            ? book.localFavoritesCount.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(book.localFavoritesCount)}
                      </span>
                    </div>
                  </div>

                  {/* Popularity */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 transition-colors min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                      <Users className="size-4 fill-blue-500/40" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-blue-500/90 uppercase tracking-wider truncate">
                        {t("aquila.popularity")}
                      </span>
                      <span
                        className="text-base font-extrabold text-foreground tracking-tight leading-none mt-0.5"
                        title={
                          book.localPopularity != null
                            ? book.localPopularity.toLocaleString()
                            : "0"
                        }
                      >
                        {formatCompactNumber(book.localPopularity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show More / Show Less Toggle Button (Mobile/Tablet only) */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground flex lg:hidden items-center justify-center gap-1.5 py-2 border border-border/30 hover:border-border/60 bg-muted/20 cursor-pointer"
                onClick={() => setShowMoreInfo(!showMoreInfo)}
              >
                <span>
                  {showMoreInfo ? t("aquila.showLess") : t("aquila.showMore")}
                </span>
                {showMoreInfo ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>

              {/* Information Details (Collapsible on mobile, always shown on desktop) */}
              <div
                className={cn(
                  "space-y-4 pt-2 border-t border-border/40",
                  showMoreInfo ? "block" : "hidden lg:block",
                )}
              >
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("aquila.information")}
                </h3>
                <div className="space-y-3">
                  <RrMediaInfoRow
                    label={t("aquila.publisher")}
                    value={book.publisher}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.publishedDate")}
                    value={formattedPublishedDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.chapters")}
                    value={book.chapters}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.price")}
                    value={
                      book.retailPrice
                        ? `${book.retailPrice} ${book.retailPriceCurrency || ""}`
                        : null
                    }
                  />
                  <RrMediaInfoRow
                    label="ISBN-10"
                    value={book.isbn10}
                    className="font-mono"
                  />
                  <RrMediaInfoRow
                    label="ISBN-13"
                    value={book.isbn13}
                    className="font-mono"
                  />
                  <RrMediaInfoRow
                    label={t("aquila.pages")}
                    value={book.pages}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.language")}
                    value={book.language}
                    className="uppercase"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header (Desktop) */}
            <motion.div
              variants={itemVariants}
              className="space-y-2 hidden lg:block"
            >
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {displaySubtitle && displaySubtitle !== displayTitle && (
                <p className="text-lg text-muted-foreground font-semibold">
                  {displaySubtitle}
                </p>
              )}
            </motion.div>

            {/* Description */}
            <RrMediaDescription description={book.description} />

            {/* Genres / Subjects */}
            {book.subjects && book.subjects.length > 0 && (
              <RrMediaGenres genres={book.subjects} />
            )}

            {/* Staff */}
            {staff && staff.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  {t("aquila.staff")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {staff.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md p-3.5 rounded-xl hover:border-border/50 transition-all"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {person.name}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {person.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Similar Series Carousel */}
            <RrMediaSimilar mediaType="book" mediaId={id} />

            {/* Stats Dashboard (Score & Status distribution charts) */}
            <RrMediaStatsDashboard
              localAverageScore={book.localAverageScore}
              localPopularity={book.localPopularity}
              localFavoritesCount={book.localFavoritesCount}
              localStatusDistribution={book.localStatusDistribution}
              localScoreDistribution={book.localScoreDistribution}
              showCounters={false}
            />

            {/* Friends Progress */}
            <RrMediaFriendsProgress
              mediaId={book.id.toString()}
              mediaType="book"
            />
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={book.updatedAt}
          mediaType="book"
          mediaId={Number(id)}
          mediaData={{ ...book, relations: [], characters: [] }}
        />
      </div>
    </div>
  );
}
