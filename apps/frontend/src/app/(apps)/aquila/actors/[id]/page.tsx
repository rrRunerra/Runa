"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Film, Tv, Award, Heart, BookOpen, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import { RrMediaDetailsSkeleton } from "@/components/rrComponents/aquila/details/rrMediaDetailsSkeleton";
import { useTranslation } from "react-i18next";

interface ActorRoleV2 {
  id: number;
  mediaType: string;
  mediaId: number;
  titlePrimary: string;
  coverImage: string | null;
  role: string | null;
  customRole: string | null;
  characterName: string | null;
  characterImage: string | null;
}

interface ActorDetailV2 {
  id: number;
  anilistId: number | null;
  malId: number | null;
  tvDBId: number | null;
  namePrimary: string | null;
  nameNative: string | null;
  nameAlternative: string[];
  image: string | null;
  images: string[] | null;
  description: string | null;
  language: string | null;
  roles: ActorRoleV2[];
}

const MEDIA_TYPE_ROUTE: Record<string, string> = {
  ANIME: "/aquila/anime",
  MOVIE: "/aquila/movies",
  TV: "/aquila/tv",
  MANGA: "/aquila/manga",
  BOOK: "/aquila/books",
  GAME: "/aquila/games",
};

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

export default function ActorPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session } = useSession();

  const {
    data: actor,
    error,
    isLoading,
  } = useSWR<ActorDetailV2>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/actor/${id}` : null,
    fetcher,
  );

  const { data: favStatus, mutate: mutateFav } = useSWR<{ favorited: boolean }>(
    id && session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/favorites/STAFF/${id}/status`, session.accessToken]
      : null,
    fetcher,
  );

  const toggleFavorite = async () => {
    if (!session?.accessToken) return;
    const isFavorited = favStatus?.favorited;

    try {
      if (isFavorited) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/STAFF/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ type: "STAFF", targetId: id }),
        });
      }
      mutateFav({ favorited: !isFavorited });
    } catch (e) {
      console.error("Failed to toggle favorite", e);
    }
  };

  const rolesByType = useMemo(() => {
    if (!actor?.roles) return {} as Record<string, ActorRoleV2[]>;
    return actor.roles.reduce<Record<string, ActorRoleV2[]>>((acc, role) => {
      const key = role.mediaType.toUpperCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(role);
      return acc;
    }, {});
  }, [actor]);

  const displayName = useMemo(() => {
    if (!actor) return t("aquila.actorDetails", "Actor Details");
    return actor.namePrimary || t("aquila.unknownActor", "Unknown Actor");
  }, [actor, t]);

  if (isLoading) {
    return <RrMediaDetailsSkeleton type="actor" />;
  }

  if (error || !actor) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background items-center justify-center space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground">
          {t("aquila.actorNotFound", "Actor not found")}
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

  const hasNoRoles = !actor.roles || actor.roles.length === 0;

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
              {actor.image ? (
                <Image
                  src={actor.image}
                  alt={displayName}
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
                {t("aquila.actorInfo", "Actor Info")}
              </h4>

              {actor.nameNative && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.nativeName", "Native Name")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {actor.nameNative}
                  </span>
                </div>
              )}

              {actor.language && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.language", "Language")}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {actor.language}
                  </span>
                </div>
              )}

              {actor.nameAlternative && actor.nameAlternative.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    {t("aquila.alternativeNames", "Alternative Names")}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {actor.nameAlternative.map((name, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 rounded">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {actor.anilistId && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.anilistId", "AniList ID")}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    #{actor.anilistId}
                  </span>
                </div>
              )}

              {actor.malId && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.malId", "MAL ID")}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    #{actor.malId}
                  </span>
                </div>
              )}

              {actor.tvDBId && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {t("aquila.tvdbId", "TVDB ID")}
                  </span>
                  <span className="text-sm font-medium text-primary">
                    #{actor.tvDBId}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {actor.description && (
              <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                  {t("aquila.biography", "Biography")}
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-6">
                  {actor.description}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Roles & Appearances */}
          <div className="md:col-span-3 space-y-6">
            {/* Header Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  {displayName}
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
            </div>

            {/* Roles Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-foreground border-b border-border/20 pb-2">
                {t("aquila.rolesAndAppearances", "Roles & Appearances")}
              </h3>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {hasNoRoles ? (
                  <div className="text-center py-12 bg-card/20 border border-border/10 rounded-2xl">
                    <Award className="size-12 text-muted-foreground/60 mx-auto stroke-[1.2] mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {t("aquila.noMappedRoles", "No mapped roles found for this actor.")}
                    </p>
                  </div>
                ) : (
                  Object.entries(rolesByType).map(([mediaType, roles]) => (
                    <RolesSection
                      key={mediaType}
                      title={getSectionTitle(mediaType, t)}
                      icon={getSectionIcon(mediaType)}
                      roles={roles}
                      routePrefix={MEDIA_TYPE_ROUTE[mediaType] ?? `/aquila/${mediaType.toLowerCase()}`}
                    />
                  ))
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSectionTitle(mediaType: string, t: (key: string, fallback: string) => string): string {
  const map: Record<string, string> = {
    ANIME: t("aquila.animeVoiced", "Anime Voiced"),
    MOVIE: t("aquila.moviesPlayed", "Movies Played"),
    TV: t("aquila.tvRoles", "TV Roles"),
    MANGA: t("aquila.mangaRoles", "Manga Roles"),
    BOOK: t("aquila.bookRoles", "Book Roles"),
    GAME: t("aquila.gameRoles", "Game Roles"),
  };
  return map[mediaType] ?? mediaType;
}

function getSectionIcon(mediaType: string): React.ReactNode {
  const cls = "size-4 text-primary";
  switch (mediaType) {
    case "ANIME":
    case "TV":
      return <Tv className={cls} />;
    case "MOVIE":
      return <Film className={cls} />;
    case "MANGA":
    case "BOOK":
      return <BookOpen className={cls} />;
    case "GAME":
      return <Gamepad2 className={cls} />;
    default:
      return <Award className={cls} />;
  }
}

interface RolesSectionProps {
  title: string;
  icon: React.ReactNode;
  roles: ActorRoleV2[];
  routePrefix: string;
}

function RolesSection({ title, icon, roles, routePrefix }: RolesSectionProps) {
  const { t } = useTranslation();
  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-foreground/90">
        {icon}
        <span>{title}</span>
        <span className="text-xs text-muted-foreground font-normal">
          ({roles.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role, idx) => {
          const charName = role.characterName || t("aquila.unknownCharacter", "Unknown Character");
          const displayRole = role.customRole || role.role?.toLowerCase() || "cast";

          return (
            <div
              key={idx}
              className="flex items-stretch justify-between bg-card/45 border border-border/30 backdrop-blur-md rounded-xl overflow-hidden hover:border-border/50 hover:bg-accent/5 transition-all duration-300"
            >
              {/* Media Column (Left) */}
              <Link
                href={`${routePrefix}/${role.mediaId}`}
                className="flex items-center gap-3 p-3 min-w-0 flex-1 hover:text-primary group/media"
              >
                <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
                  {role.coverImage ? (
                    <Image
                      src={role.coverImage}
                      alt={role.titlePrimary}
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground group-hover/media:text-primary transition-colors duration-150">
                    {role.titlePrimary}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {t("aquila.role", "Role: {{role}}", { role: displayRole })}
                  </p>
                </div>
              </Link>

              {/* Character Column (Right) */}
              <div className="flex items-center gap-3 p-3 min-w-0 flex-1 justify-end border-l border-border/10 text-right">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">
                    {charName}
                  </p>
                  <p className="text-[9px] text-muted-foreground capitalize">
                    {role.role?.toLowerCase() || "cast"}
                  </p>
                </div>
                <div className="relative size-9 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
                  {role.characterImage ? (
                    <Image
                      src={role.characterImage}
                      alt={charName}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-xs text-muted-foreground font-bold">
                      ?
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
