"use client";

import { CalendarIcon, Play, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";

interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
}

interface MediaStudio {
  name: string;
}

interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

interface Media {
  id: string;
  title: {
    romaji: string;
    english?: string;
  };
  coverImage: {
    large: string;
  };
  bannerImage?: string;
  format: string;
  status: string;
  description: string;
  runtime?: number;
  genres: string[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  studios?: MediaStudio[];
}

export default function MovieDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [movie, setMovie] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const session = useSession();

  // List State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);

  useEffect(() => {
    async function fetchMovie() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/movie/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMovie(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id]);

  const fetchEntry = async () => {
    if (session.status !== "authenticated" || !movie?.id) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/${movie.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.data.accessToken}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setHasListEntry(!!data);
      } else {
        setHasListEntry(false);
      }
    } catch (e) {
      console.error("Failed to fetch movie list entry", e);
    }
  };

  useEffect(() => {
    fetchEntry();
  }, [session.status, movie?.id]);

  useEffect(() => {
    document.title = `Aquila > Movie > ${movie?.title.english ?? movie?.title.romaji}`
  }, [movie?.title])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Movie not found</h2>
        <Button asChild>
          <Link href="/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Banner */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent z-10" />
        {movie.bannerImage ? (
          <img
            src={movie.bannerImage}
            alt={movie.title?.romaji}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}

        {/* TheTVDB Attribution Watermark */}
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
          <div className="container mx-auto px-4 pt-4 flex justify-end items-start pointer-events-auto">
            <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-xs p-2 rounded-lg border border-white/10 shadow-md">
              <span className="text-[8px] text-white/60 uppercase font-bold tracking-widest leading-none">
                Data Provided By
              </span>
              <Link
                href="https://thetvdb.com"
                target="_blank"
                className="opacity-80 hover:opacity-100 transition-opacity"
              >
                <Image
                  src="https://thetvdb.com/images/logo.png"
                  alt="TheTVDB Logo"
                  width={80}
                  height={20}
                  style={{ width: "80px", height: "auto" }}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Poster & Actions */}
          <div className="shrink-0 w-full md:w-[280px] flex flex-col gap-4">
            <div className="flex flex-row md:flex-col gap-4 items-end md:items-stretch">
              <div className="aspect-2/3 w-32 sm:w-40 md:w-full rounded-xl overflow-hidden shadow-2xl border-4 border-background shrink-0">
                <img
                  src={movie.coverImage.large}
                  alt={movie.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-2 w-full">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer hover:bg-primary hover:border-primary"
                          size="lg"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL}/list/movie/entry/save`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${session.data?.accessToken}`,
                                  },
                                  body: JSON.stringify({
                                    tvdbId: parseInt(movie.id),
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
                          className="w-full cursor-pointer hover:bg-primary hover:text-primary hover:border-primary"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                        size="lg"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <MovieEditDialog
                      media={movie}
                      hasListEntry={hasListEntry}
                      open={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      onSaved={() => {
                        fetchEntry();
                      }}
                      onDeleted={() => {
                        setHasListEntry(false);
                      }}
                    />
                  </>
                )}
                {movie.trailers && movie.trailers.length > 0 && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={movie.trailers?.[0]?.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Watch Trailer
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Format
                </span>
                <span className="font-medium text-foreground">
                  {movie.format}
                </span>
              </div>
              {movie.runtime && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">
                    Runtime
                  </span>
                  <span className="font-medium text-foreground">
                    {movie.runtime} mins
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold">
                  Status
                </span>
                <span className="font-medium capitalize text-foreground">
                  {movie.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
            </div>

            {movie.studios && movie.studios.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2 text-muted-foreground">
                  Studios
                </h4>
                <div className="flex flex-wrap gap-2">
                  {movie.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-muted text-foreground px-2 py-1 rounded transition-colors"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}


          </div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 pt-4 md:pt-32 mb-32">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-2">
                {movie.title.english || movie.title.romaji}
              </h1>
              {movie.title.romaji &&
                movie.title.romaji !== movie.title.english && (
                  <p className="text-sm text-muted-foreground italic">
                    Also known as: {movie.title.romaji}
                  </p>
                )}
            </div>

            <div
              className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: movie.description }}
            />

            {movie.genres && movie.genres.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres?.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {movie.characters && movie.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {movie.characters.slice(0, 10).map((char, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border"
                    >
                      <img
                        src={char.image.length > 0 ? char.image : undefined}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {char.name}
                        </p>
                        {char.personName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {char.personName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


