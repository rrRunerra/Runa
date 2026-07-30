"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Film,
  Tv,
  BookOpen,
  Heart,
  Gamepad2,
  Book,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import { parseSafeDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { useTranslation } from "react-i18next";

interface AppearanceActor {
  id: number;
  namePrimary?: string | null;
  nameNative?: string | null;
  name?: string | null;
  image: string | null;
}

interface CharacterMediaAppearance {
  id: number;
  title: string;
  secondaryTitle?: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  role: string | null;
  actor?: AppearanceActor | null;
}

interface GroupedMediaAppearance {
  id: number;
  title: string;
  secondaryTitle?: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  role: string | null;
  actors: AppearanceActor[];
}

function groupAppearances(
  appearances: CharacterMediaAppearance[] = [],
): GroupedMediaAppearance[] {
  const map = new Map<number, GroupedMediaAppearance>();

  for (const item of appearances) {
    let existing = map.get(item.id);
    if (!existing) {
      existing = {
        id: item.id,
        title: item.title,
        secondaryTitle: item.secondaryTitle,
        coverImage: item.coverImage,
        format: item.format,
        status: item.status,
        role: item.role,
        actors: [],
      };
      map.set(item.id, existing);
    }

    if (item.actor && item.actor.id) {
      if (!existing.actors.some((a) => a.id === item.actor!.id)) {
        existing.actors.push(item.actor);
      }
    }
  }

  return Array.from(map.values());
}

interface CharacterDetail {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  namePrimary?: string | null;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  nameNative?: string | null;
  nameAlternative?: string[];
  nameAlternativeSpoiler?: string[];
  image?: string | null;
  images?: Record<string, string | null> | null;
  description?: string | null;
  gender?: string | null;
  age?: string | null;
  bloodType?: string | null;
  dateOfBirthYear?: number | null;
  dateOfBirthMonth?: number | null;
  dateOfBirthDay?: number | null;
  favorites?: number | null;

  animeAppearances?: CharacterMediaAppearance[];
  mangaAppearances?: CharacterMediaAppearance[];
  movieAppearances?: CharacterMediaAppearance[];
  tvAppearances?: CharacterMediaAppearance[];
  gameAppearances?: CharacterMediaAppearance[];
  bookAppearances?: CharacterMediaAppearance[];
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
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export default function CharacterPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session } = useSession();

  const {
    data: char,
    error,
    isLoading,
  } = useSWR<CharacterDetail>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/character/${id}` : null,
    fetcher,
  );

  const { data: favStatus, mutate: mutateFav } = useSWR<{ favorited: boolean }>(
    id && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/CHARACTER/${id}/status`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const toggleFavorite = async () => {
    if (!session?.accessToken) return;
    const isFavorited = favStatus?.favorited;

    try {
      if (isFavorited) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/CHARACTER/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            type: "CHARACTER",
            targetId: id,
          }),
        });
      }
      mutateFav({ favorited: !isFavorited });
    } catch (e) {
      console.error("Failed to toggle favorite", e);
    }
  };

  const fullName = useMemo(() => {
    if (!char) return t("aquila.characterDetails", "Character Details");
    if (char.namePrimary) return char.namePrimary;
    return [char.nameFirst, char.nameMiddle, char.nameLast]
      .filter(Boolean)
      .join(" ");
  }, [char, t]);

  const dobStr = useMemo(() => {
    if (!char || (!char.dateOfBirthMonth && !char.dateOfBirthDay)) return null;
    const months = [
      t("months.january", "January"),
      t("months.february", "February"),
      t("months.march", "March"),
      t("months.april", "April"),
      t("months.may", "May"),
      t("months.june", "June"),
      t("months.july", "July"),
      t("months.august", "August"),
      t("months.september", "September"),
      t("months.october", "October"),
      t("months.november", "November"),
      t("months.december", "December"),
    ];
    const monthStr = char.dateOfBirthMonth
      ? months[char.dateOfBirthMonth - 1]
      : "";
    const dayStr = char.dateOfBirthDay ? String(char.dateOfBirthDay) : "";
    const yearStr = char.dateOfBirthYear ? `, ${char.dateOfBirthYear}` : "";
    return [monthStr, dayStr].filter(Boolean).join(" ") + yearStr;
  }, [char, t]);

  const allVoiceActors = useMemo(() => {
    if (!char) return [];
    const map = new Map<number, AppearanceActor>();
    const appearancesList = [
      ...(char.animeAppearances || []),
      ...(char.movieAppearances || []),
      ...(char.tvAppearances || []),
      ...(char.gameAppearances || []),
    ];
    for (const item of appearancesList) {
      if (item.actor && item.actor.id) {
        if (!map.has(item.actor.id)) {
          map.set(item.actor.id, item.actor);
        }
      }
    }
    return Array.from(map.values());
  }, [char]);

  if (isLoading) {
    return <RrMediaDetailsSkeleton type="character" />;
  }

  if (error || !char) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background items-center justify-center space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground">
          {t("aquila.characterNotFound", "Character not found")}
        </h2>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-2 size-4" /> {t("aquila.goBack", "Go Back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background pb-12 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/2 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/2 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 pt-6 space-y-6 relative z-10">
        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Column: Image & Details */}
          <div className="space-y-4">
            <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden shadow-2xl border border-border/30 bg-muted">
              {char.image ? (
                <Image
                  src={char.image}
                  alt={fullName}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-muted-foreground">
                  <User className="size-16 stroke-[1.2]" />
                </div>
              )}
            </div>

            {/* Profile Info Cards */}
            <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                {t("aquila.profileInfo", "Profile Info")}
              </h4>
              {char.nameNative && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.nativeName", "Native Name")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {char.nameNative}
                  </span>
                </div>
              )}
              {char.gender && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.gender", "Gender")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {char.gender}
                  </span>
                </div>
              )}
              {char.age && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.age", "Age")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {char.age}
                  </span>
                </div>
              )}
              {char.bloodType && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.bloodType", "Blood Type")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {char.bloodType}
                  </span>
                </div>
              )}
              {dobStr && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.dateOfBirth", "Date of Birth")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {dobStr}
                  </span>
                </div>
              )}
              {char.favorites !== undefined &&
                char.favorites !== null &&
                char.favorites > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground block">
                      {t("aquila.favorites", "Favorites")}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {char.favorites.toLocaleString()}
                    </span>
                  </div>
                )}
            </div>

            {/* External Links */}
            {(char.anilistId || char.malId || char.bangumiId) && (
              <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                  {t("aquila.externalLinks", "External Links")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {char.anilistId && (
                    <a
                      href={`https://anilist.co/character/${char.anilistId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
                    >
                      AniList <ExternalLink className="size-3" />
                    </a>
                  )}
                  {char.malId && (
                    <a
                      href={`https://myanimelist.net/character/${char.malId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
                    >
                      MyAnimeList <ExternalLink className="size-3" />
                    </a>
                  )}
                  {char.bangumiId && (
                    <a
                      href={`https://bgm.tv/character/${char.bangumiId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
                    >
                      Bangumi <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Alternative Names */}
            {char.nameAlternative && char.nameAlternative.length > 0 && (
              <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                  {t("aquila.aliases", "Aliases")}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {char.nameAlternative.map((alt, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] rounded-lg"
                    >
                      {alt}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Bio & Appearances */}
          <div className="md:col-span-3 space-y-6">
            {/* Header Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {fullName}
                </h1>
                {session && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleFavorite}
                    className="rounded-xl border-border/40 hover:bg-muted"
                  >
                    <Heart
                      className={`size-5 transition-colors ${
                        favStatus?.favorited
                          ? "fill-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    />
                  </Button>
                )}
              </div>
              {char.nameAlternativeSpoiler &&
                char.nameAlternativeSpoiler.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("aquila.spoilerAliases", "Spoiler Aliases:")}
                    </span>
                    {char.nameAlternativeSpoiler.map((spoiler, idx) => (
                      <span
                        key={idx}
                        className="bg-foreground/85 hover:bg-transparent text-transparent hover:text-foreground px-2 py-0.5 rounded-lg cursor-pointer transition-colors duration-200 select-none border border-border/20 text-xs"
                        title={t(
                          "aquila.hoverRevealSpoiler",
                          "Hover to reveal spoiler name",
                        )}
                      >
                        {spoiler}
                      </span>
                    ))}
                  </div>
                )}
            </div>

            {/* Biography */}
            {char.description && (
              <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl space-y-3">
                <h3 className="text-base font-bold text-foreground">
                  {t("aquila.biography", "Biography")}
                </h3>
                <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm select-text border-t border-border/10 pt-3">
                  {parseSafeDescription(char.description)}
                </div>
              </div>
            )}

            {/* Appearances */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-foreground border-b border-border/20 pb-2">
                {t("aquila.appearances", "Appearances")}
              </h3>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {/* Anime Section */}
                {char.animeAppearances && char.animeAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.anime", "Anime")}
                    icon={<Tv className="size-4 text-primary" />}
                    appearances={char.animeAppearances}
                    routePrefix="/aquila/anime"
                  />
                )}

                {/* Movie Section */}
                {char.movieAppearances && char.movieAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.movies", "Movies")}
                    icon={<Film className="size-4 text-primary" />}
                    appearances={char.movieAppearances}
                    routePrefix="/aquila/movies"
                  />
                )}

                {/* TV Section */}
                {char.tvAppearances && char.tvAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.tvShows", "TV Shows")}
                    icon={<Tv className="size-4 text-primary" />}
                    appearances={char.tvAppearances}
                    routePrefix="/aquila/tv"
                  />
                )}

                {/* Manga Section */}
                {char.mangaAppearances && char.mangaAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.manga", "Manga")}
                    icon={<BookOpen className="size-4 text-primary" />}
                    appearances={char.mangaAppearances}
                    routePrefix="/aquila/manga"
                  />
                )}

                {/* Game Section */}
                {char.gameAppearances && char.gameAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.games", "Games")}
                    icon={<Gamepad2 className="size-4 text-primary" />}
                    appearances={char.gameAppearances}
                    routePrefix="/aquila/games"
                  />
                )}

                {/* Book Section */}
                {char.bookAppearances && char.bookAppearances.length > 0 && (
                  <AppearanceSection
                    title={t("aquila.books", "Books")}
                    icon={<Book className="size-4 text-primary" />}
                    appearances={char.bookAppearances}
                    routePrefix="/aquila/books"
                  />
                )}
              </motion.div>
            </div>

            {/* Voice Actors Section */}
            {allVoiceActors.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border/20">
                <h3 className="text-lg font-bold text-foreground border-b border-border/20 pb-2 flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  {t("aquila.voiceActors", "Voice Actors")}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({allVoiceActors.length})
                  </span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allVoiceActors.map((actor) => {
                    const actorName =
                      actor.namePrimary ||
                      actor.name ||
                      actor.nameNative ||
                      t("aquila.unknownActor", "Unknown Actor");
                    return (
                      <Link
                        key={actor.id}
                        href={`/aquila/actors/${actor.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card/45 border border-border/30 backdrop-blur-md hover:border-border/50 hover:bg-accent/10 transition-all group"
                      >
                        <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
                          {actor.image ? (
                            <Image
                              src={actor.image}
                              alt={actorName}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-xs text-muted-foreground">
                              <User className="size-5 stroke-[1.2]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                            {actorName}
                          </p>
                          {actor.nameNative && (
                            <p className="text-xs text-muted-foreground truncate">
                              {actor.nameNative}
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground/80 block mt-0.5 capitalize">
                            {t("aquila.actorVa", "Actor / VA")}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppearanceSectionProps {
  title: string;
  icon: React.ReactNode;
  appearances: CharacterMediaAppearance[];
  routePrefix: string;
}

function AppearanceSection({
  title,
  icon,
  appearances,
  routePrefix,
}: AppearanceSectionProps) {
  const { t } = useTranslation();

  const grouped = useMemo(() => groupAppearances(appearances), [appearances]);

  if (!grouped || grouped.length === 0) return null;

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-foreground/90">
        {icon}
        <span>{title}</span>
        <span className="text-xs text-muted-foreground font-normal">
          ({grouped.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map((app) => (
          <Link
            key={app.id}
            href={`${routePrefix}/${app.id}`}
            className="flex items-center gap-3 p-3 bg-card/45 border border-border/30 backdrop-blur-md rounded-xl overflow-hidden hover:border-border/50 hover:bg-accent/5 transition-all duration-300 min-h-18 group/media"
          >
            <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
              {app.coverImage ? (
                <Image
                  src={app.coverImage}
                  alt={app.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground group-hover/media:text-primary transition-colors duration-150">
                {app.title}
              </p>
              {app.secondaryTitle && app.secondaryTitle !== app.title && (
                <p className="text-[11px] text-muted-foreground truncate font-normal">
                  {app.secondaryTitle}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1 py-0 rounded"
                >
                  {app.format}
                </Badge>
                <span className="text-[10px] text-muted-foreground truncate">
                  {t("aquila.role", "Role: {{role}}", {
                    role: app.role?.toLowerCase() || "cast",
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
