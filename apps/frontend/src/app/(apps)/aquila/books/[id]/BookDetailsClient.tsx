"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Star,
  Heart,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  UserCheck,
  BarChart3,
  ImageIcon,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { fetcher } from "@/lib/fetcher";
import { RrMediaEditDialog } from "@/components/rrComponents/aquila/rrMediaEditDialog";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";
import { RrMediaRefreshButton } from "@/components/rrComponents/aquila/rrMediaRefreshButton";
import { BookEntity } from "@/types/book.entities";
import { RrMediaInfoRow } from "@/components/rrComponents/aquila/details/rrMediaInfoRow";
import { RrMediaFriendsProgress } from "@/components/rrComponents/aquila/details/rrMediaFriendsProgress";
import { RrMediaDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaGenres } from "@/components/rrComponents/aquila/details/rrMediaGenres";
import { RrMediaCharacters } from "@/components/rrComponents/aquila/details/rrMediaCharacters";
import { RrMediaStaff } from "@/components/rrComponents/aquila/details/rrMediaStaff";
import { RrMediaRelations } from "@/components/rrComponents/aquila/details/rrMediaRelations";
import { RrMediaStatsDashboard } from "@/components/rrComponents/aquila/details/rrMediaStatsDashboard";
import { RrMediaSimilar } from "@/components/rrComponents/aquila/details/rrMediaSimilar";
import { RrMediaImages } from "@/components/rrComponents/aquila/details/rrMediaImages";
import { RrMediaFooter } from "@/components/rrComponents/aquila/details/rrMediaFooter";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { RrMediaReviews } from "@/components/rrComponents/aquila/details/rrMediaReviews";
import { MessageSquare } from "lucide-react";
import { MediaType } from "@/types/aquila";
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

  // ─── Display Titles & Images ─────────────────────────────────────────────

  const displayTitle =
    book?.titlePrimary || book?.titleSecondary || t("aquila.bookDetails");

  const displaySubtitle = book?.subtitle ?? null;
  const coverUrl = book?.coverImage ?? "";
  const bannerUrl = book?.bannerImage ?? "";

  // ─── External Sources & Providers ───────────────────────────────────────

  const providers = useMemo(() => {
    if (!book) return [];
    const list: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addProvider = (name: string, url?: string | null): void => {
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      list.push({ name, url });
    };

    if (book.infoLink) addProvider("Google Books", book.infoLink);
    if (book.previewLink) addProvider("Preview", book.previewLink);
    if (book.website) addProvider("Official Site", book.website);

    if (book.sources) {
      for (const src of book.sources) {
        if (src.url && src.provider) {
          addProvider(src.provider, src.url);
        }
      }
    }

    return list;
  }, [book]);

  // ─── Formatted Release Date ──────────────────────────────────────────────

  const formattedReleaseDate = useMemo((): string | null => {
    if (!book?.releaseDateYear && !book?.releaseDate) return null;
    const dateStr =
      book.releaseDate ||
      `${book.releaseDateYear}-${String(book.releaseDateMonth || 1).padStart(2, "0")}-${String(book.releaseDateDay || 1).padStart(2, "0")}`;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  }, [book]);

  // ─── Characters (V2 shape) ───────────────────────────────────────────────

  const characters = useMemo(() => {
    if (!book?.characters) return [];
    return book.characters.map((bc: any) => {
      const charName =
        bc.namePrimary ||
        bc.character?.namePrimary ||
        bc.character?.nameNative ||
        t("aquila.unknownCharacter");

      const charImage = bc.image || bc.character?.image || "";
      const actorObj = bc.actor;

      return {
        id: bc.id,
        characterId: bc.characterId || bc.id,
        name: charName,
        native: bc.nameNative || bc.character?.nameNative || "",
        image: charImage,
        role: bc.role || "MAIN",
        voiceActor: actorObj
          ? {
              id: actorObj.id,
              name:
                actorObj.namePrimary ||
                actorObj.nameNative ||
                t("aquila.unknownActor"),
              image: actorObj.image || "",
              role: actorObj.role || "Actor",
            }
          : null,
      };
    });
  }, [book, t]);

  // ─── Staff (V2 shape) ───────────────────────────────────────────────────

  const staff = useMemo(() => {
    if (!book) return [];
    const items: any[] = [];

    if (book.staff && book.staff.length > 0) {
      book.staff.forEach((st: any) => {
        const person = st.actor || st.staff || st;
        items.push({
          id: st.id,
          mediaType: "BOOK",
          mediaId: Number(id),
          staffId: person.id || st.id,
          role: st.customRole || st.role || "Staff",
          staff: {
            id: person.id || st.id,
            namePrimary: person.namePrimary || person.name || "",
            nameNative: person.nameNative ?? "",
            image: person.image ?? "",
          },
        });
      });
    } else {
      if (book.authors) {
        book.authors.forEach((author: string, idx: number) => {
          items.push({
            id: `author-${idx}`,
            mediaType: "BOOK",
            mediaId: Number(id),
            staffId: idx,
            role: t("aquila.author", "Author"),
            staff: {
              id: idx,
              namePrimary: author,
              nameNative: "",
              image: "",
            },
          });
        });
      }
    }

    return items;
  }, [book, id, t]);

  // ─── Relations (V2 shape) ────────────────────────────────────────────────

  const relations = useMemo(() => {
    if (!book?.relations) return [];
    return book.relations.map((rel: any) => {
      const relType = rel.type ?? rel.relationType ?? "";
      const mediaType = rel.targetType ?? "BOOK";
      return {
        id: rel.targetId || rel.id,
        relationType: relType,
        title: {
          english: rel.titlePrimary ?? "",
          romaji: rel.titleSecondary ?? "",
          native: "",
        },
        format: rel.format ?? "BOOK",
        type: mediaType,
        coverImage: rel.coverImage ?? "",
      };
    });
  }, [book]);

  // ─── Publishers & Studios ────────────────────────────────────────────────

  const publishers = useMemo(() => {
    if (!book) return [];
    const list: string[] = [];
    if (book.publishers) list.push(...book.publishers);
    if (book.studios) {
      for (const st of book.studios) {
        if (typeof st === "string") list.push(st);
        else if (st?.name) list.push(st.name);
      }
    }
    return Array.from(new Set(list));
  }, [book]);

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
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={displayTitle}
            fill
            sizes="100vw"
            className="object-cover scale-105 filter blur-[1px] brightness-75"
            priority
          />
        ) : (
          <div className="w-full h-full bg-muted/10" />
        )}
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
                        {book.localAverageScore ?? book.averageScore
                          ? (book.localAverageScore ?? book.averageScore)?.toFixed(1)
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
                          (book.localFavoritesCount ?? book.favorites ?? 0).toLocaleString()
                        }
                      >
                        {formatCompactNumber(book.localFavoritesCount ?? book.favorites)}
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
                          (book.localPopularity ?? book.popularity ?? 0).toLocaleString()
                        }
                      >
                        {formatCompactNumber(book.localPopularity ?? book.popularity)}
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
                  {publishers.length > 0 && (
                    <RrMediaInfoRow
                      label={t("aquila.publisher")}
                      value={
                        <span
                          className="text-right text-xs max-w-37.5 truncate block"
                          title={publishers.join(", ")}
                        >
                          {publishers.join(", ")}
                        </span>
                      }
                    />
                  )}
                  <RrMediaInfoRow
                    label={t("aquila.publishedDate")}
                    value={formattedReleaseDate}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.pages")}
                    value={book.pageCount}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.chapters")}
                    value={book.chapterCount}
                  />
                  <RrMediaInfoRow
                    label={t("aquila.volumes")}
                    value={book.volumeCount}
                  />
                  {book.retailPrice != null && (
                    <RrMediaInfoRow
                      label={t("aquila.price")}
                      value={`${book.retailPrice} ${book.retailPriceCurrency || ""}`}
                    />
                  )}
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
                    label={t("aquila.language")}
                    value={book.originalLanguage}
                    className="uppercase"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Main Content & Tabs */}
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
            {(book.genres?.length > 0 || book.subjects?.length > 0) && (
              <RrMediaGenres
                genres={
                  book.genres?.length > 0
                    ? book.genres
                    : book.subjects ?? []
                }
              />
            )}

            {/* Tabs Navigation */}
            <Tabs defaultValue="overview" className="w-full space-y-6">
              <TabsList className="bg-card/60 border border-border/30 backdrop-blur-xl p-1.5 rounded-2xl w-full flex overflow-x-auto justify-start sm:justify-center gap-1 scrollbar-none">
                <TabsTrigger
                  value="overview"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <LayoutGrid className="size-3.5 mr-1.5" />
                  {t("aquila.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="characters"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <Users className="size-3.5 mr-1.5" />
                  {t("aquila.characters")}
                </TabsTrigger>
                <TabsTrigger
                  value="staff"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <UserCheck className="size-3.5 mr-1.5" />
                  {t("aquila.staff")}
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <ImageIcon className="size-3.5 mr-1.5" />
                  {t("aquila.images")}
                </TabsTrigger>
                <TabsTrigger
                  value="stats"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <BarChart3 className="size-3.5 mr-1.5" />
                  {t("aquila.stats")}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all cursor-pointer"
                >
                  <MessageSquare className="size-3.5 mr-1.5" />
                  {t("aquila.reviews")}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab Content */}
              <TabsContent value="overview" className="space-y-6 outline-none">
                {/* Characters Preview (first 10) */}
                {characters.length > 0 && (
                  <RrMediaCharacters
                    characters={characters}
                    limitCount={10}
                    hideToggleButton={true}
                  />
                )}

                {/* Staff Preview (first 6) */}
                {staff.length > 0 && (
                  <RrMediaStaff staff={staff} limit={6} />
                )}

                {/* Relations */}
                {relations.length > 0 && (
                  <RrMediaRelations relations={relations} />
                )}

                {/* Similar Series Carousel */}
                <RrMediaSimilar mediaType="book" mediaId={id} />

                {/* Friends Progress */}
                <RrMediaFriendsProgress
                  mediaId={book.id.toString()}
                  mediaType="book"
                />
              </TabsContent>

              {/* Characters Tab Content */}
              <TabsContent
                value="characters"
                className="space-y-6 outline-none"
              >
                {characters.length > 0 ? (
                  <RrMediaCharacters
                    characters={characters}
                    showAllInitial={true}
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t(
                      "aquila.noCharacters",
                      "No character information available",
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Staff Tab Content */}
              <TabsContent value="staff" className="space-y-6 outline-none">
                {staff.length > 0 ? (
                  <RrMediaStaff staff={staff} showAllInitial={true} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
                    {t("aquila.noStaff", "No staff information available")}
                  </div>
                )}
              </TabsContent>

              {/* Images Tab Content */}
              <TabsContent value="images" className="space-y-6 outline-none">
                <RrMediaImages anime={book as any} />
              </TabsContent>

              {/* Stats Tab Content */}
              <TabsContent value="stats" className="space-y-6 outline-none">
                <RrMediaStatsDashboard
                  localAverageScore={book.localAverageScore ?? book.averageScore}
                  localPopularity={book.localPopularity ?? book.popularity}
                  localFavoritesCount={
                    book.localFavoritesCount ?? book.favorites
                  }
                  localStatusDistribution={
                    book.localStatusDistribution ?? book.statusDistribution
                  }
                  localScoreDistribution={
                    book.localScoreDistribution ?? book.scoreDistribution
                  }
                  showCounters={true}
                />
              </TabsContent>

              {/* Reviews Tab Content */}
              <TabsContent value="reviews" className="space-y-6 outline-none">
                <RrMediaReviews mediaType={MediaType.BOOK} mediaId={Number(id)} />
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Media Footer */}
        <RrMediaFooter
          providers={providers}
          updatedAt={book.updatedAt}
          mediaType="book"
          mediaId={Number(id)}
          mediaData={{
            ...book,
            relations,
            characters,
          }}
        />
      </div>
    </div>
  );
}
