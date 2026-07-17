import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

export interface FavoriteItem {
  id: string;
  userId: string;
  type: string;
  mediaId: string;
  createdAt: string;
  title: string;
  image: string;
}

interface FavoritesTabProps {
  username: string;
  session: any;
}

function getMediaUrl(type: string, mediaId: string): string {
  const t = type.toUpperCase();
  if (t === "ANIME") return `/aquila/anime/${mediaId}`;
  if (t === "MANGA") return `/aquila/manga/${mediaId}`;
  if (t === "TV") return `/aquila/tv/${mediaId}`;
  if (t === "MOVIE") return `/aquila/movies/${mediaId}`;
  if (t === "GAME") return `/aquila/games/${mediaId}`;
  if (t === "BOOK") return `/aquila/books/${mediaId}`;
  if (t === "CHARACTER") return `/aquila/characters/${mediaId}`;
  if (t === "STAFF") return `/aquila/actors/${mediaId}`;
  return `/aquila/browse`;
}

export default function RrFavoritesTab({
  username,
  session,
}: FavoritesTabProps): React.ReactNode {
  const { t } = useTranslation();
  const url = username
    ? `${process.env.NEXT_PUBLIC_API_URL}/favorites/user/${username}`
    : null;

  const { data: favorites, isLoading: loading } = useSWR<FavoriteItem[]>(
    url ? [url, session?.accessToken] : null,
    fetcher,
  );

  const animeFavs = useMemo(
    () => favorites?.filter((f) => f.type === "ANIME") || [],
    [favorites],
  );
  const mangaFavs = useMemo(
    () => favorites?.filter((f) => f.type === "MANGA") || [],
    [favorites],
  );
  const tvFavs = useMemo(
    () => favorites?.filter((f) => f.type === "TV") || [],
    [favorites],
  );
  const movieFavs = useMemo(
    () => favorites?.filter((f) => f.type === "MOVIE") || [],
    [favorites],
  );
  const gameFavs = useMemo(
    () => favorites?.filter((f) => f.type === "GAME") || [],
    [favorites],
  );
  const bookFavs = useMemo(
    () => favorites?.filter((f) => f.type === "BOOK") || [],
    [favorites],
  );
  const characterFavs = useMemo(
    () => favorites?.filter((f) => f.type === "CHARACTER") || [],
    [favorites],
  );
  const staffFavs = useMemo(
    () => favorites?.filter((f) => f.type === "STAFF") || [],
    [favorites],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="aspect-2/3 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const hasFavorites = favorites && favorites.length > 0;

  return (
    <div className="flex flex-col gap-8 w-full">
      {!hasFavorites ? (
        <Empty className="border border-dashed p-12 rounded-2xl flex flex-col items-center justify-center gap-3">
          <EmptyMedia variant="icon">
            <Heart className="text-muted-foreground/50 fill-none" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("polaris.favorites.noFavorites")}</EmptyTitle>
            <EmptyDescription>
              {t("polaris.favorites.tracksAndItems")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {[
            { titleKey: "favoriteAnime", items: animeFavs, type: "anime" },
            { titleKey: "favoriteManga", items: mangaFavs, type: "manga" },
            {
              titleKey: "favoriteCharacters",
              items: characterFavs,
              type: "characters",
            },
            { titleKey: "favoriteActors", items: staffFavs, type: "actors" },
            { titleKey: "favoriteGames", items: gameFavs, type: "games" },
            { titleKey: "favoriteTvShows", items: tvFavs, type: "tv" },
            { titleKey: "favoriteMovies", items: movieFavs, type: "movies" },
            { titleKey: "favoriteBooks", items: bookFavs, type: "books" },
          ]
            .filter((grp) => grp.items.length > 0)
            .map((grp) => (
              <div key={grp.titleKey} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Heart
                    className="size-4 text-primary fill-primary/10"
                    aria-hidden="true"
                  />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {t(`polaris.favorites.${grp.titleKey}`)} ({grp.items.length})
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {grp.items.map((fav) => (
                    <Link
                      key={fav.id}
                      href={getMediaUrl(fav.type, fav.mediaId)}
                      prefetch={false}
                      className="block focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-xl transition-all"
                    >
                      <motion.div
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative aspect-2/3 rounded-xl overflow-hidden border bg-card cursor-pointer shadow-sm"
                      >
                        {fav.image ? (
                          <Image
                            src={getSafeImageUrl(fav.image)}
                            alt={fav.title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 25vw, (max-width: 1024px) 16vw, 12vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-muted-foreground/60 bg-muted italic">
                            {fav.title || t("polaris.favorites.noImage")}
                          </div>
                        )}

                        {/* Hover overlay for title */}
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/80 to-transparent p-3 pt-6 z-10 transition-opacity duration-200">
                          <p className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                            {fav.title}
                          </p>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
