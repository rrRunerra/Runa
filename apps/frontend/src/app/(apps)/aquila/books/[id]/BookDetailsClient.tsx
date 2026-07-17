"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Star,
  TrendingUp,
  Heart,
  BookOpen,
  User,
  Globe,
  ShoppingBag,
  Calendar,
  ExternalLink,
} from "lucide-react";
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
import { Media } from "@/types/aquila";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { BookEntity } from "@/types/book.entities";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { useTranslation } from "react-i18next";

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

export default function BookDetailsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const id = params?.id as string;
  const session = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

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

  const displayTitle = book?.titleString ?? t("aquila.bookDetails", "Book Details");
  const displaySubtitle = book?.subtitle ?? null;
  const coverUrl = book?.coverImage ?? "";

  const formattedPublishedDate = useMemo((): string | null => {
    if (!book?.publishedDate) return null;
    try {
      return new Date(book.publishedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return book.publishedDate;
    }
  }, [book?.publishedDate]);

  const publishedYear = useMemo((): string | null => {
    if (!book?.publishedDate) return null;
    try {
      return new Date(book.publishedDate).getFullYear().toString();
    } catch {
      return null;
    }
  }, [book?.publishedDate]);

  const staff = useMemo(() => {
    if (!book) return [];
    const items: any[] = [];
    if (book.authors) {
      book.authors.forEach((author: string, idx: number) => {
        items.push({ id: `author-${idx}`, name: author, role: t("aquila.author", "Author") });
      });
    }
    if (book.artists) {
      book.artists.forEach((artist: string, idx: number) => {
        items.push({ id: `artist-${idx}`, name: artist, role: t("aquila.artist", "Artist") });
      });
    }
    return items;
  }, [book, t]);

  useEffect((): void => {
    if (!book) return;
    document.title = `Aquila > Book > ${displayTitle}`;
  }, [book, displayTitle]);

  if (bookLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin z-10" />
      </div>
    );
  }

  if (bookError || !book) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background relative overflow-hidden items-center justify-center gap-4">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground z-10">
          {t("aquila.bookNotFound", "Book not found")}
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse?type=books">{t("aquila.backToBrowse", "Back to Browse")}</Link>
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
        toast.success(t("aquila.addedToList", "Added to list!"));
        mutateListEntry();
      } else {
        toast.error(t("aquila.failedAddToList", "Failed to add to list"));
      }
    } catch {
      toast.error(t("aquila.failedAddToList", "Failed to add to list"));
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden p-0">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] left-[-100px] w-[300px] h-[300px] bg-cyan-600/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section */}
      <div className="relative h-[240px] md:h-[360px] w-full overflow-hidden shrink-0 z-10">
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent z-10" />

        <div className="w-full h-full bg-muted/10" />

        {/* Google Books Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-card/85 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 shadow-md">
              <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://books.google.com"
                target="_blank"
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Google Books
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Details layout container */}
      <div className="px-4 md:px-8 pb-16 -mt-16 md:-mt-24 relative z-20 w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8 w-full"
        >
          {/* Left Column - Cover & Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[260px] flex flex-col gap-4"
          >
            <div className="bg-card/75 border border-border/40 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="relative aspect-2/3 w-36 sm:w-40 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0 bg-muted flex items-center justify-center">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={displayTitle}
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.status === "authenticated" && session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer rounded-xl transition-all shadow-md"
                          size="lg"
                          onClick={handleQuickAdd}
                        >
                          {t("aquila.quickAdd", "Quick Add")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl"
                          size="lg"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          {t("aquila.addToList", "Add to List")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl"
                        size="lg"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        {t("aquila.editEntry", "Edit Entry")}
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

                {book.previewLink && (
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer rounded-xl flex items-center justify-center gap-2 mt-2"
                    asChild
                  >
                    <a
                      href={book.previewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen className="size-4" />
                      {t("aquila.previewBook", "Preview Book")}
                    </a>
                  </Button>
                )}

                {book.infoLink && (
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer rounded-xl flex items-center justify-center gap-2"
                    asChild
                  >
                    <a
                      href={book.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TrendingUp className="size-4" />
                      Google Books
                    </a>
                  </Button>
                )}

                {book.buyLink && (
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer rounded-xl flex items-center justify-center gap-2"
                    asChild
                  >
                    <a
                      href={book.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ShoppingBag className="size-4" />
                      {t("aquila.buyBook", "Buy Book")}
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("aquila.information", "Information")}
              </h3>
              <div className="space-y-3">
                {book.publisher && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{t("aquila.publisher", "Publisher")}</span>
                    <span
                      className="font-medium text-foreground text-right text-xs max-w-[150px] truncate"
                      title={book.publisher}
                    >
                      {book.publisher}
                    </span>
                  </div>
                )}
                {formattedPublishedDate && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">
                      {t("aquila.publishedDate", "Published Date")}
                    </span>
                    <span className="font-medium text-foreground">
                      {formattedPublishedDate}
                    </span>
                  </div>
                )}
                {book.chapters && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{t("aquila.chapters", "Chapters")}</span>
                    <span className="font-medium text-foreground">
                      {book.chapters}
                    </span>
                  </div>
                )}
                {book.retailPrice && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{t("aquila.price", "Price")}</span>
                    <span className="font-medium text-foreground">
                      {book.retailPrice} {book.retailPriceCurrency}
                    </span>
                  </div>
                )}
                {book.isbn10 && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">ISBN-10</span>
                    <span className="font-medium text-foreground font-mono text-xs">
                      {book.isbn10}
                    </span>
                  </div>
                )}
                {book.isbn13 && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">ISBN-13</span>
                    <span className="font-medium text-foreground font-mono text-xs">
                      {book.isbn13}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-6 lg:pt-8 min-w-0">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {displayTitle}
              </h1>
              {displaySubtitle && displaySubtitle !== displayTitle && (
                <p className="text-lg text-muted-foreground font-semibold">
                  {displaySubtitle}
                </p>
              )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3"
            >
              {publishedYear && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {publishedYear}
                  </span>
                </div>
              )}
              {book.pages && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {t("aquila.pagesCount", "{{count}} pages", { count: book.pages })}
                  </span>
                </div>
              )}
              {book.chapters && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {t("aquila.chaptersCount", "{{count}} chapters", { count: book.chapters })}
                  </span>
                </div>
              )}
              {book.averageRating && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-foreground">
                    {book.averageRating} ({t("aquila.reviewsCount", "{{count}} reviews", { count: book.ratingsCount || 0 })})
                  </span>
                </div>
              )}
              {book.language && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground uppercase">
                    {book.language}
                  </span>
                </div>
              )}
              {book.maturityRating && (
                <Badge
                  variant="outline"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground"
                >
                  {book.maturityRating.replace(/_/g, " ")}
                </Badge>
              )}
            </motion.div>

            {/* Stats Dashboard */}
            <RrMediaStatsDashboard
              localAverageScore={book.localAverageScore}
              localPopularity={book.localPopularity}
              localFavoritesCount={book.localFavoritesCount}
              localStatusDistribution={book.localStatusDistribution}
              localScoreDistribution={book.localScoreDistribution}
            />

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-base font-bold text-foreground mb-3">
                {t("aquila.about", "About")}
              </h3>
              {book.description ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors">
                  <p>{book.description}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("aquila.noDescriptionAvailable", "No description available.")}
                </p>
              )}
            </motion.div>

            {/* Staff */}
            {staff && staff.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">{t("aquila.staff", "Staff")}</h3>
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
