"use client";

import { Badge, Button } from "@runa/ui";
import { Play } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

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
  name: string;
}

interface MediaEpisode {
  id: string;
  number: number;
  name: string;
  overview?: string;
  image?: string;
  airDate?: string;
}

interface MediaSeason {
  id: string;
  number: number;
  name?: string;
  image?: string;
  episodeCount?: number;
  episodes?: MediaEpisode[];
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
  episodes?: number;
  duration?: number;
  genres: string[];
  source?: string;
  tags?: { name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
  staff?: { id: string; name: string; role: string }[];
  seasons?: MediaSeason[];
}

export default function TvDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [tv, setTv] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  const session = useSession();

  useEffect(() => {
    async function fetchTv() {
      if (!id) return;
      try {
        const res = await fetch(`/api/tv/${id}`);
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTv(data);
      } catch (_err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTv();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !tv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">TV Show not found</h2>
        <Button asChild>
          <Link href="/browse">Back to Browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Banner Section */}
      <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent z-10" />
        {tv.bannerImage ? (
          <img
            src={tv.bannerImage}
            alt={tv.title?.romaji}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column - Cover & Main Actions */}
          <div className="shrink-0 w-full md:w-[280px] flex flex-col gap-4">
            <div className="aspect-2/3 w-full rounded-xl overflow-hidden shadow-2xl border-4 border-background">
              <img
                src={tv.coverImage.extraLarge || tv.coverImage.large}
                alt={tv.title?.romaji}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2">
              {session.data?.user && (
                <Button className="w-full" size="lg">
                  Add to List
                </Button>
              )}
              {tv.trailers && tv.trailers.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={tv.trailers[0].url}
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

            <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">{tv.format}</span>
              </div>
              {tv.episodes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Episodes</span>
                  <span className="font-medium">{tv.episodes}</span>
                </div>
              )}
              {tv.duration && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{tv.duration} mins</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {tv.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {tv.seasons && tv.seasons.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Seasons</span>
                  <span className="font-medium">{tv.seasons.length}</span>
                </div>
              )}
              {tv.source && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium capitalize">
                    {tv.source.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
              )}
              {tv.averageScore && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium">{tv.averageScore}%</span>
                </div>
              )}
              {tv.popularity && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Popularity</span>
                  <span className="font-medium">
                    {tv.popularity.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Studios */}
            {tv.studios && tv.studios.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2">Studios</h4>
                <div className="flex flex-wrap gap-2">
                  {tv.studios.map((studio) => (
                    <span
                      key={studio.name}
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                    >
                      {studio.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Links */}
            {tv.externalLinks && tv.externalLinks.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2">Links</h4>
                <div className="flex flex-wrap gap-2">
                  {tv.externalLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
                    >
                      {link.site}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="flex-1 space-y-8 pt-4 md:pt-32 mb-32">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-2">
                {tv.title.english || tv.title.romaji}
              </h1>
              {(tv.title.romaji && tv.title.romaji !== tv.title.english) ||
              tv.title.native ? (
                <p className="text-sm text-muted-foreground italic">
                  Also known as:{" "}
                  {[
                    tv.title.romaji !== tv.title.english
                      ? tv.title.romaji
                      : null,
                    tv.title.native,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
            </div>

            {/* Description */}
            <div
              className="prose prose-zinc dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: tv.description }}
            />

            {/* Genres & Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tv.genres?.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                {tv.tags?.slice(0, 10).map((tag) => (
                  <Badge
                    key={tag.name}
                    variant="outline"
                    className="border-dashed"
                  >
                    {tag.name}
                    {tag.rank && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {tag.rank}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Seasons & Episodes */}
            {tv.seasons && tv.seasons.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Seasons</h3>
                <div className="flex flex-col gap-3">
                  {tv.seasons.map((season) => (
                    <div
                      key={season.id}
                      className="bg-card rounded-xl border border-border overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSeason(
                            expandedSeason === season.id ? null : season.id,
                          )
                        }
                        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {season.image && (
                            <img
                              src={season.image}
                              alt={season.name || `Season ${season.number}`}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">
                              {season.name || `Season ${season.number}`}
                            </p>
                            {season.episodeCount && (
                              <p className="text-xs text-muted-foreground">
                                {season.episodeCount} episodes
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {expandedSeason === season.id ? "▲" : "▼"}
                        </span>
                      </button>

                      {expandedSeason === season.id &&
                        season.episodes &&
                        season.episodes.length > 0 && (
                          <div className="border-t border-border divide-y divide-border">
                            {season.episodes.map((episode) => (
                              <div
                                key={episode.id}
                                className="flex items-start gap-4 p-4 hover:bg-accent/20 transition-colors"
                              >
                                {episode.image && (
                                  <img
                                    src={episode.image}
                                    alt={episode.name}
                                    className="w-28 h-16 rounded-lg object-cover shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">
                                    <span className="text-muted-foreground mr-2">
                                      E{episode.number}
                                    </span>
                                    {episode.name}
                                  </p>
                                  {episode.overview && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {episode.overview}
                                    </p>
                                  )}
                                  {episode.airDate && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {episode.airDate}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Characters */}
            {tv.characters && tv.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Cast</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tv.characters.slice(0, 10).map((char) => (
                    <div
                      key={char.name}
                      className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border"
                    >
                      <img
                        src={char.image}
                        alt={char.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
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
