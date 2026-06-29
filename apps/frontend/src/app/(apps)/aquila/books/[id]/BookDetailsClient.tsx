"use client";

import React, { useEffect, useState } from "react";
import { Star, TrendingUp, Heart, BookOpen, User, Globe, ShoppingBag } from "lucide-react";
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
  } = useSWR<Media>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/book/details/${id}` : null,
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

  const { data: relatedBooks } = useSWR<any[]>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/book/details/${id}/related` : null,
    fetcher
  );

  const { data: editions } = useSWR<any[]>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/book/details/${id}/editions` : null,
    fetcher
  );

  const hasListEntry = !!listEntry;

  useEffect((): void => {
    if (!book) return;
    document.title = `Aquila > Book > ${book.title.english ?? book.title.romaji ?? ""}`;
  }, [book]);

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
          Book not found
        </h2>
        <Button asChild variant="default" className="z-10 rounded-xl">
          <Link href="/aquila/browse?type=books">Back to Browse</Link>
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
        toast.success("Added to list!");
        mutateListEntry();
      } else {
        toast.error("Failed to add to list");
      }
    } catch {
      toast.error("Failed to add to list");
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
        {book.bannerImage ? (
          <Image
            src={book.bannerImage}
            alt={book.title?.romaji ?? "Banner"}
            fill
            sizes="100vw"
            className="object-cover scale-105 filter blur-[1px] brightness-75"
            priority
          />
        ) : (
          <div className="w-full h-full bg-muted/10" />
        )}

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
                {book.coverImage.extraLarge || book.coverImage.large ? (
                  <Image
                    src={book.coverImage.extraLarge || book.coverImage.large}
                    alt={book.title?.romaji ?? "Cover"}
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
                          Quick Add
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer rounded-xl"
                          size="lg"
                          onClick={(): void => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full cursor-pointer rounded-xl"
                        size="lg"
                        onClick={(): void => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <RrMediaEditDialog
                      media={{
                        id: book.id.toString(),
                        type: "book",
                        title: book.title,
                        coverImage: { large: book.coverImage.large },
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
                    <a href={book.previewLink} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="size-4" />
                      Preview Book
                    </a>
                  </Button>
                )}

                {book.infoLink && (
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer rounded-xl flex items-center justify-center gap-2"
                    asChild
                  >
                    <a href={book.infoLink} target="_blank" rel="noopener noreferrer">
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
                    <a href={book.buyLink} target="_blank" rel="noopener noreferrer">
                      <ShoppingBag className="size-4" />
                      Buy Book
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata Sidebar */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium text-foreground">Book</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground capitalize">
                    {book.status?.toLowerCase()}
                  </span>
                </div>
                {book.publisher && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Publisher</span>
                    <span className="font-medium text-foreground text-right text-xs max-w-[150px] truncate" title={book.publisher}>
                      {book.publisher}
                    </span>
                  </div>
                )}
                {book.publishedDate && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Published Date</span>
                    <span className="font-medium text-foreground">
                      {book.publishedDate}
                    </span>
                  </div>
                )}
                {book.retailPrice && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Price</span>
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
                {book.title.english || book.title.romaji}
              </h1>
              {book.subtitle && (
                <p className="text-lg text-muted-foreground font-semibold">
                  {book.subtitle}
                </p>
              )}
            </motion.div>

            {/* Quick Info Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              {book.pages && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{book.pages} pages</span>
                </div>
              )}
              {book.averageRating && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-foreground">
                    {book.averageRating} ({book.ratingsCount || 0} reviews)
                  </span>
                </div>
              )}
              {book.language && (
                <div className="bg-card/45 border border-border/30 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground uppercase">{book.language}</span>
                </div>
              )}
              {book.maturityRating && (
                <Badge variant="outline" className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground">
                  {book.maturityRating.replace(/_/g, " ")}
                </Badge>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-base font-bold text-foreground mb-3">
                About
              </h3>
              {book.description ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors whitespace-pre-wrap">
                  {book.description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No description available.
                </p>
              )}
            </motion.div>

            {/* Subjects */}
            {book.genres && book.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  Subjects
                </h3>
                <div className="flex flex-wrap gap-2">
                  {book.genres.slice(0, 15).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="rounded-xl px-3 py-1 text-xs"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Staff */}
            {book.staff && book.staff.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Staff</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {book.staff.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between bg-card/45 border border-border/30 backdrop-blur-md p-3.5 rounded-xl hover:border-border/50 transition-all"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {person.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {person.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Editions */}
            {editions && editions.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Other Editions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {editions.slice(0, 5).map((edition) => (
                    <Link
                      key={edition.id}
                      href={`/aquila/books/${edition.id}`}
                      prefetch={false}
                      className="group flex flex-col gap-2 bg-card/25 border border-border/30 hover:border-border/50 p-2 rounded-xl transition-all"
                    >
                      <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/20">
                        {edition.coverImage?.large ? (
                          <Image
                            src={edition.coverImage.large}
                            alt={edition.title.english}
                            fill
                            sizes="(max-width: 640px) 100px, 150px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                            <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {edition.title.english || edition.title.romaji}
                        </p>
                        {edition.publishYear && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {edition.publishYear}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Similar Books */}
            {relatedBooks && relatedBooks.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">Similar Books</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {relatedBooks.slice(0, 5).map((relBook) => (
                    <Link
                      key={relBook.id}
                      href={`/aquila/books/${relBook.id}`}
                      prefetch={false}
                      className="group flex flex-col gap-2 bg-card/25 border border-border/30 hover:border-border/50 p-2 rounded-xl transition-all"
                    >
                      <div className="relative aspect-2/3 w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/20">
                        {relBook.coverImage?.large ? (
                          <Image
                            src={relBook.coverImage.large}
                            alt={relBook.title.english}
                            fill
                            sizes="(max-width: 640px) 100px, 150px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                            <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {relBook.title.english || relBook.title.romaji}
                        </p>
                        {relBook.publishYear && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {relBook.publishYear}
                          </p>
                        )}
                      </div>
                    </Link>
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
