"use client";

import { Star, TrendingUp, Heart, BookOpen, Layers } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MangaEditDialog } from "@/components/aquila/MangaEditDialog";
import { motion } from "framer-motion";

interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
}

interface MediaRelation {
  id: string;
  relationType: string;
  title: { romaji: string; english?: string };
  format: string;
  type: string;
}

interface MediaExternalLink {
  id: string;
  url: string;
  site: string;
}

interface MediaStudio {
  id?: string;
  name: string;
}

interface Media {
  id: string;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    extraLarge?: string;
    large: string;
    color?: string;
  };
  bannerImage?: string;
  format: string;
  status: string;
  description: string;
  startDate?: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
  chapters?: number;
  volumes?: number;
  genres: string[];
  source?: string;
  tags?: { id: string; name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  meanScore?: number;
  synonyms?: string[];
  hashtag?: string;
  countryOfOrigin?: string;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
  staff?: { id: string; name: string; role: string }[];
}

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
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function MangaDetailsPage() {
  const params = useParams();
  const id: string = params?.id as string;
  const session = useSession();

  const [manga, setManga] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasListEntry, setHasListEntry] = useState(false);

  useEffect(() => {
    if (session.status === "authenticated" && session.data?.user?.id && id) {
      const fetchEntry = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/${id}`,
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
          console.error("Failed to fetch manga list entry", e);
        }
      };
      fetchEntry();
    }
  }, [session.data?.user?.id, id, session.status]);

  useEffect(() => {
    async function fetchManga() {
      if (!id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/manga/details/${id}`,
        );
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setManga(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchManga();
  }, [id]);

  useEffect(() => {
    if (!manga) return;
    document.title = `Aquila > Manga > ${manga?.title.english ?? manga?.title.romaji ?? ""}`;
  }, [manga?.title.romaji, manga?.title.english]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-500 animate-spin" />
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 relative overflow-x-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl font-bold text-zinc-100">Manga not found</h2>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/aquila/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32 relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-100px] w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Banner Section */}
      <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
        {manga.bannerImage ? (
          <img
            src={manga.bannerImage}
            alt={manga.title?.romaji}
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-75"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
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
            <div className="bg-zinc-900/70 border border-zinc-800/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center sm:items-start lg:items-stretch">
              <div className="aspect-2/3 w-40 sm:w-44 lg:w-full rounded-xl overflow-hidden shadow-lg border border-zinc-700/30 shrink-0">
                <img
                  src={manga.coverImage.extraLarge || manga.coverImage.large}
                  alt={manga.title?.romaji}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 flex flex-col gap-3 w-full justify-center">
                {session.data?.user && (
                  <>
                    {!hasListEntry ? (
                      <>
                        <Button
                          className="w-full cursor-pointer bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-600/20"
                          size="lg"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL}/list/manga/entry/save`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${session.data?.accessToken}`,
                                  },
                                  body: JSON.stringify({
                                    mangaId: Number(id),
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
                          className="w-full cursor-pointer border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl"
                          size="lg"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add to List
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="w-full cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-100 rounded-xl"
                        size="lg"
                        onClick={() => setIsDialogOpen(true)}
                      >
                        Edit Entry
                      </Button>
                    )}
                    <MangaEditDialog
                      media={manga}
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
            <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
                Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Format</span>
                  <span className="font-medium text-zinc-100">{manga.format}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Chapters</span>
                  <span className="font-medium text-zinc-100">{manga.chapters || "?"}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Volumes</span>
                  <span className="font-medium text-zinc-100">{manga.volumes || "?"}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {manga.status?.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                  <span className="text-zinc-400">Source</span>
                  <span className="font-medium text-zinc-100 capitalize">
                    {manga.source?.replace(/_/g, " ").toLowerCase() || "?"}
                  </span>
                </div>
                {manga.countryOfOrigin && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Country</span>
                    <span className="font-medium text-zinc-100">{manga.countryOfOrigin}</span>
                  </div>
                )}
                {manga.hashtag && (
                  <div className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2">
                    <span className="text-zinc-400">Hashtag</span>
                    <span className="font-medium text-teal-400">{manga.hashtag}</span>
                  </div>
                )}
                {manga.synonyms && manga.synonyms.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-400">Synonyms</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {manga.synonyms.slice(0, 4).map((syn, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-850 text-zinc-300 text-xs px-2 py-0.5 rounded border border-zinc-800"
                        >
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* External Links */}
            {manga.externalLinks && manga.externalLinks.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-xl rounded-2xl p-5">
                <h4 className="font-semibold text-sm tracking-wide text-zinc-400 uppercase mb-3">
                  External Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {manga.externalLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/40 px-3 py-1.5 rounded-xl transition-all"
                    >
                      {link.site}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 lg:pt-8 mb-32">
            {/* Header */}
            <motion.div variants={itemVariants} className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                {manga.title.english || manga.title.romaji}
              </h1>
              {(manga.title.romaji &&
                manga.title.romaji !== manga.title.english) ||
              manga.title.native ? (
                <p className="text-sm text-zinc-400 italic">
                  Also known as:{" "}
                  {[
                    manga.title.romaji !== manga.title.english
                      ? manga.title.romaji
                      : null,
                    manga.title.native,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </motion.div>

            {/* Stats Dashboard */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 text-teal-400 fill-teal-400/20" />
                  <span>Average Score</span>
                </div>
                <span className="text-2xl font-extrabold text-teal-400">
                  {manga.averageScore ? `${manga.averageScore}%` : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Popularity</span>
                </div>
                <span className="text-2xl font-extrabold text-amber-400">
                  {manga.popularity ? manga.popularity.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                  <span>Favorites</span>
                </div>
                <span className="text-2xl font-extrabold text-rose-400">
                  {manga.favourites ? manga.favourites.toLocaleString() : "N/A"}
                </span>
              </div>
              <div className="bg-zinc-900/55 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chapters</span>
                </div>
                <span className="text-2xl font-extrabold text-cyan-400">
                  {manga.chapters || "?"}
                </span>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              variants={itemVariants}
              className="bg-zinc-900/40 border border-zinc-800/30 backdrop-blur-sm p-6 rounded-2xl"
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-3">Synopsis</h3>
              <div
                className="prose prose-zinc dark:prose-invert max-w-none text-zinc-300 leading-relaxed text-sm md:text-base prose-p:my-2 prose-a:text-teal-400 hover:prose-a:text-teal-300 transition-colors"
                dangerouslySetInnerHTML={{ __html: manga.description }}
              />
            </motion.div>

            {/* Genres & Tags */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-bold text-zinc-100">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {manga.genres?.map((genre, qid) => (
                  <Badge
                    key={qid}
                    className="bg-teal-500/10 border border-teal-500/35 hover:bg-teal-500/15 text-teal-300 px-3 py-1 rounded-xl text-xs font-medium"
                  >
                    {genre}
                  </Badge>
                ))}
                {manga.tags?.slice(0, 8).map((tag, qid) => (
                  <Badge
                    key={qid}
                    variant="outline"
                    className="border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 px-3 py-1 rounded-xl text-xs"
                  >
                    {tag.name}
                    {tag.rank && (
                      <span className="ml-1 text-[10px] text-zinc-500">
                        {tag.rank}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* Staff */}
            {manga.staff && manga.staff.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Staff</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manga.staff.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/40 backdrop-blur-md p-4 rounded-xl hover:border-zinc-700/60 transition-all"
                    >
                      <p className="text-sm font-semibold text-zinc-200">
                        {person.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-zinc-850/50 border-zinc-700/30 text-zinc-400"
                      >
                        {person.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Characters */}
            {manga.characters && manga.characters.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Characters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {manga.characters.slice(0, 10).map((char, qid) => (
                    <div
                      key={qid}
                      className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/40 backdrop-blur-md p-3 rounded-xl hover:border-zinc-700/60 transition-all group"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-zinc-100">
                          {char.name}
                        </p>
                        <p className="text-xs text-zinc-400 capitalize">
                          {char.role?.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Relations */}
            {manga.relations && manga.relations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">Relations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manga.relations.map((relation, qid) => {
                    let href: string;
                    switch (relation.type) {
                      case "ANIME":
                        href = `/aquila/anime/${relation.id}`;
                        break;
                      case "MANGA":
                        href = `/aquila/manga/${relation.id}`;
                        break;
                      default:
                        href = `/aquila/${relation.type.toLowerCase()}/${relation.id}`;
                    }

                    return (
                      <Link
                        key={qid}
                        href={href}
                        className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/40 p-4 rounded-xl hover:bg-zinc-850 hover:border-zinc-700/60 transition-all group"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                            {relation.title.english || relation.title.romaji}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {relation.format}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-zinc-850/50 border-zinc-700/30 text-zinc-400 capitalize"
                        >
                          {relation.relationType.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
