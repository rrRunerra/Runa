"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Film, Tv, BookOpen, Calendar, HelpCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import { parseSafeDescription } from "@/components/rrComponents/aquila/details/rrMediaDescription";

interface AppearanceActor {
  id: number;
  name: string;
  image: string | null;
}

interface CharacterMediaAppearance {
  id: number;
  title: string;
  coverImage: string | null;
  format: string;
  status: string;
  role: string | null;
  actor?: AppearanceActor | null;
}

interface CharacterDetail {
  id: number;
  anilistId: number | null;
  nameFirst: string | null;
  nameMiddle: string | null;
  nameLast: string | null;
  nameNative: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];
  image: string | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirthYear: number | null;
  dateOfBirthMonth: number | null;
  dateOfBirthDay: number | null;

  animeAppearances: CharacterMediaAppearance[];
  mangaAppearances: CharacterMediaAppearance[];
  movieAppearances: CharacterMediaAppearance[];
  tvAppearances: CharacterMediaAppearance[];
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
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: session } = useSession();

  const { data: char, error, isLoading } = useSWR<CharacterDetail>(
    id ? `${process.env.NEXT_PUBLIC_API_URL}/character/${id}` : null,
    fetcher
  );

  const { data: favStatus, mutate: mutateFav } = useSWR<{ favorited: boolean }>(
    id && session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/favorites/CHARACTER/${id}/status`, session.accessToken]
      : null,
    fetcher
  );

  const toggleFavorite = async () => {
    if (!session?.accessToken) return;
    const isFavorited = favStatus?.favorited;

    try {
      if (isFavorited) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites/CHARACTER/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
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
    if (!char) return "Character Details";
    return [char.nameFirst, char.nameMiddle, char.nameLast].filter(Boolean).join(" ");
  }, [char]);

  const dobStr = useMemo(() => {
    if (!char || (!char.dateOfBirthMonth && !char.dateOfBirthDay)) return null;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthStr = char.dateOfBirthMonth ? months[char.dateOfBirthMonth - 1] : "";
    const dayStr = char.dateOfBirthDay ? String(char.dateOfBirthDay) : "";
    const yearStr = char.dateOfBirthYear ? `, ${char.dateOfBirthYear}` : "";
    return [monthStr, dayStr].filter(Boolean).join(" ") + yearStr;
  }, [char]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !char) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-background items-center justify-center space-y-4">
        <h2 className="text-xl font-bold text-muted-foreground">Character not found</h2>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
          <ArrowLeft className="mr-2 size-4" /> Go Back
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
                <Image src={char.image} alt={fullName} fill priority className="object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center text-muted-foreground">
                  <User className="size-16 stroke-[1.2]" />
                </div>
              )}
            </div>

            {/* Profile Info Cards */}
            <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                Profile Info
              </h4>
              {char.nameNative && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">Native Name</span>
                  <span className="text-sm font-medium text-foreground">{char.nameNative}</span>
                </div>
              )}
              {char.gender && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">Gender</span>
                  <span className="text-sm font-medium text-foreground">{char.gender}</span>
                </div>
              )}
              {char.age && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">Age</span>
                  <span className="text-sm font-medium text-foreground">{char.age}</span>
                </div>
              )}
              {char.bloodType && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">Blood Type</span>
                  <span className="text-sm font-medium text-foreground">{char.bloodType}</span>
                </div>
              )}
              {dobStr && (
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground block">Date of Birth</span>
                  <span className="text-sm font-medium text-foreground">{dobStr}</span>
                </div>
              )}
            </div>

            {/* Alternative Names */}
            {char.nameAlternative && char.nameAlternative.length > 0 && (
              <div className="bg-card/30 border border-border/20 backdrop-blur-sm p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1.5">
                  Aliases
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {char.nameAlternative.map((alt, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] rounded-lg">
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
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{fullName}</h1>
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
              {char.nameAlternativeSpoiler && char.nameAlternativeSpoiler.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Spoiler Aliases:</span>
                  {char.nameAlternativeSpoiler.map((spoiler, idx) => (
                    <span
                      key={idx}
                      className="bg-foreground/85 hover:bg-transparent text-transparent hover:text-foreground px-2 py-0.5 rounded-lg cursor-pointer transition-colors duration-200 select-none border border-border/20 text-xs"
                      title="Hover to reveal spoiler name"
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
                <h3 className="text-base font-bold text-foreground">Biography</h3>
                <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm select-text border-t border-border/10 pt-3">
                  {parseSafeDescription(char.description)}
                </div>
              </div>
            )}

            {/* Appearances */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-foreground border-b border-border/20 pb-2">Appearances</h3>

              <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                {/* Anime Section */}
                {char.animeAppearances && char.animeAppearances.length > 0 && (
                  <AppearanceSection
                    title="Anime"
                    icon={<Tv className="size-4 text-primary" />}
                    appearances={char.animeAppearances}
                    routePrefix="/aquila/anime"
                  />
                )}

                {/* Movie Section */}
                {char.movieAppearances && char.movieAppearances.length > 0 && (
                  <AppearanceSection
                    title="Movies"
                    icon={<Film className="size-4 text-primary" />}
                    appearances={char.movieAppearances}
                    routePrefix="/aquila/movies"
                  />
                )}

                {/* TV Section */}
                {char.tvAppearances && char.tvAppearances.length > 0 && (
                  <AppearanceSection
                    title="TV Shows"
                    icon={<Tv className="size-4 text-primary" />}
                    appearances={char.tvAppearances}
                    routePrefix="/aquila/tv"
                  />
                )}

                {/* Manga Section */}
                {char.mangaAppearances && char.mangaAppearances.length > 0 && (
                  <AppearanceSection
                    title="Manga"
                    icon={<BookOpen className="size-4 text-primary" />}
                    appearances={char.mangaAppearances}
                    routePrefix="/aquila/manga"
                  />
                )}
              </motion.div>
            </div>
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

function AppearanceSection({ title, icon, appearances, routePrefix }: AppearanceSectionProps) {
  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-foreground/90">
        {icon}
        <span>{title}</span>
        <span className="text-xs text-muted-foreground font-normal">({appearances.length})</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appearances.map((app, idx) => (
          <div
            key={idx}
            className="flex items-stretch justify-between bg-card/45 border border-border/30 backdrop-blur-md rounded-xl overflow-hidden hover:border-border/50 hover:bg-accent/5 transition-all duration-300"
          >
            {/* Media Info */}
            <Link
              href={`${routePrefix}/${app.id}`}
              className="flex items-center gap-3 p-3 min-w-0 flex-1 hover:text-primary group/media"
            >
              <div className="relative size-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
                {app.coverImage ? (
                  <Image src={app.coverImage} alt={app.title} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-xs text-muted-foreground">?</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground group-hover/media:text-primary transition-colors duration-150">
                  {app.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 rounded">
                    {app.format}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground capitalize">Role: {app.role?.toLowerCase() || "cast"}</span>
                </div>
              </div>
            </Link>

            {/* Actor Info */}
            {app.actor ? (
              <Link
                href={`/aquila/actors/${app.actor.id}`}
                className="flex items-center gap-3 p-3 min-w-0 flex-1 justify-end hover:text-primary group/actor border-l border-border/10 text-right hover:bg-accent/5 transition-all duration-150"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground group-hover/actor:text-primary transition-colors">
                    {app.actor.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground capitalize">Actor / VA</p>
                </div>
                <div className="relative size-9 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/20">
                  {app.actor.image ? (
                    <Image src={app.actor.image} alt={app.actor.name} fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-xs text-muted-foreground">?</div>
                  )}
                </div>
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
