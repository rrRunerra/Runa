"use client";

import { Star, Heart, BookOpen, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookEditDialog } from "@/components/aquila/BookEditDialog";
import { motion } from "framer-motion";

import { Media } from "@/types/aquila";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as any, stiffness: 100, damping: 15 },
  },
};

export default function BookDetailsPage() {
  const params = useParams();
  const id: string = params?.id as string;
  const session = useSession();

  const [book, setBook] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);

  useEffect(() => {
    if (session.status === "authenticated" && session.data?.user?.id && id) {
      const fetchEntry = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/book/entry/${id}`,
            {
              headers: {
                Authorization: `Bearer ${session.data.accessToken}`,
              },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setHasListEntry(!!data);
          }
        } catch (e) {
          console.error("Failed to fetch book list entry", e);
        }
      };
      fetchEntry();
    }
  }, [session.data?.user?.id, id, session.status]);

  useEffect(() => {
    async function fetchBook() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/book/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setBook(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [id]);

  useEffect(() => {
    if (!book) return;
    document.title = `Aquila > Book > ${book?.title.english ?? book?.title.romaji ?? ""}`;
  }, [book?.title.romaji, book?.title.english]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-foreground">Book not found</h2>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/aquila/browse?type=books">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Section */}
      <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        {book.bannerImage ? (
          <img
            src={book.bannerImage}
            alt={book.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[3px] brightness-55"
          />
        ) : (
          <div className="w-full h-full bg-card" />
        )}

        {/* Open Library Attribution */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 shadow-md">
              <span className="text-[8px] text-foreground/60 uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://openlibrary.org"
                target="_blank"
                className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                Open Library
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-24 md:-mt-36 relative z-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col lg:flex-row gap-8"
        >
          {/* Left Column - Cover & Actions */}
          <motion.div
            variants={itemVariants}
            className="shrink-0 w-full lg:w-[280px] flex flex-col gap-4"
          >
            <div className="bg-card/70 border border-border/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-border/30 shrink-0">
                <img
                  src={book.coverImage.extraLarge || book.coverImage.large}
                  alt={book.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer bg-primary hover:bg-primary/90 text-foreground font-medium rounded-xl transition-all shadow-lg shadow-primary/20"
                          size="lg"
                          onClick={async () => {
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
                                setHasListEntry(true);
                              } else {
                                toast.error("Failed to add to list");
                              }
                            } catch {
                              toast.error("Failed to add to list");
                            }
                          }}
                        >
                          Quick Add
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full cursor-pointer border-border/60 hover:bg-muted text-foreground hover:text-foreground rounded-xl"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-muted hover:bg-zinc-700 border border-border/60 text-foreground rounded-xl"
                        size="lg"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <BookEditDialog
                      media={book}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={() => setHasListEntry(true)}
                      onDeleted={() => setHasListEntry(false)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Metadata Sidebar */}
            <div className="bg-card/60 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
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
                {book.startDate?.year && (
                  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Publish Year</span>
                    <span className="font-medium text-foreground">
                      {book.startDate.year}
                    </span>
                  </div>
                )}
                {book.studios && book.studios.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Author</span>
                    <span className="font-medium text-foreground">
                      {book.studios.map((s) => s.name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 lg:pt-8 mb-32">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                {book.title.english || book.title.romaji}
              </h1>
            </motion.div>

            {/* Stats / Author Badge */}
            {book.studios && book.studios.length > 0 && (
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap gap-4"
              >
                <div className="bg-card/55 border border-border/40 backdrop-blur-md p-4 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">
                      Author
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">
                      {book.studios.map((s) => s.name).join(", ")}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-card/40 border border-border/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-3">About</h3>
              {book.description ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors whitespace-pre-wrap"
                >
                  {book.description}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description available.</p>
              )}
            </motion.div>

            {/* Genres / Subjects */}
            {book.genres && book.genres.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Subjects</h3>
                <div className="flex flex-wrap gap-2">
                  {book.genres.slice(0, 15).map((genre) => (
                    <Badge
                      key={genre}
                      className="bg-primary/10 border border-primary/30 hover:bg-primary/15 text-primary px-3 py-1 rounded-xl text-xs font-medium"
                    >
                      {genre}
                    </Badge>
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
