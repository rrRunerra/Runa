import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { getSafeImageUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { FavoriteItem } from "../UserPageClient";

interface FavoritesTabProps {
  favorites: FavoriteItem[];
}

function getMediaUrl(type: string, mediaId: string): string {
  const t = type.toUpperCase();
  if (t === "ANIME") return `/aquila/anime/${mediaId}`;
  if (t === "MANGA") return `/aquila/manga/${mediaId}`;
  if (t === "TV") return `/aquila/tv/${mediaId}`;
  if (t === "MOVIE") return `/aquila/movies/${mediaId}`;
  if (t === "GAME") return `/aquila/games/${mediaId}`;
  if (t === "BOOK") return `/aquila/books/${mediaId}`;
  return `/aquila/browse`;
}

export default function FavoritesTab({ favorites }: FavoritesTabProps) {
  const animeFavs = useMemo(() => favorites.filter((f) => f.type === "ANIME"), [favorites]);
  const mangaFavs = useMemo(() => favorites.filter((f) => f.type === "MANGA"), [favorites]);
  const tvFavs = useMemo(() => favorites.filter((f) => f.type === "TV"), [favorites]);
  const movieFavs = useMemo(() => favorites.filter((f) => f.type === "MOVIE"), [favorites]);
  const gameFavs = useMemo(() => favorites.filter((f) => f.type === "GAME"), [favorites]);
  const bookFavs = useMemo(() => favorites.filter((f) => f.type === "BOOK"), [favorites]);

  return (
    <div className="space-y-8">
      {favorites.length === 0 ? (
        <Card className="border-border/60 bg-card/30 backdrop-blur-xs rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Heart className="size-10 text-muted-foreground/40 stroke-1" aria-hidden="true" />
          <div className="text-sm font-semibold text-white">No favorites added yet</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Tracks and items favorited on Aquila will show up here.
          </p>
        </Card>
      ) : (
        <>
          {[
            { title: "Favorite Anime", items: animeFavs, type: "anime" },
            { title: "Favorite Manga", items: mangaFavs, type: "manga" },
            { title: "Favorite Games", items: gameFavs, type: "games" },
            { title: "Favorite TV Shows", items: tvFavs, type: "tv" },
            { title: "Favorite Movies", items: movieFavs, type: "movies" },
            { title: "Favorite Books", items: bookFavs, type: "books" }
          ]
            .filter((grp) => grp.items.length > 0)
            .map((grp) => (
              <div key={grp.title} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Heart className="size-4 text-purple-400 fill-purple-400/20" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {grp.title} ({grp.items.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {grp.items.map((fav) => (
                    <Link
                      key={fav.id}
                      href={getMediaUrl(fav.type, fav.mediaId)}
                      className="block focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-xl transition-all"
                    >
                      <motion.div
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative aspect-2/3 rounded-xl overflow-hidden border border-border/60 bg-card/30 cursor-pointer shadow-md"
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
                          <div className="w-full h-full flex items-center justify-center p-3 text-center text-[10px] text-muted-foreground/60 bg-muted italic">
                            {fav.title || "No Image"}
                          </div>
                        )}
                        
                        {/* Hover overlay for title */}
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/80 to-transparent p-3 pt-6 z-10 transition-opacity duration-200">
                          <p className="text-[10px] md:text-xs font-semibold text-white line-clamp-2 leading-snug">
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
