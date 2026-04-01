"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  tags?: { name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
  staff?: { id: string; name: string; role: string }[];
}

export default function MangaDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [manga, setManga] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const session = useSession();

  useEffect(() => {
    async function fetchManga() {
      if (!id) return;
      try {
        const res = await fetch(`/aquila/api/manga/${id}`);
        if (!res.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setManga(data);
      } catch (_err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchManga();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-primary animate-spin" />
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Manga not found</h2>
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
        {manga.bannerImage ? (
          <img
            src={manga.bannerImage}
            alt={manga.title?.romaji}
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
                src={manga.coverImage.extraLarge || manga.coverImage.large}
                alt={manga.title?.romaji}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-2">
              {session.data?.user && (
                <Button className="w-full" size="lg">
                  Add to List
                </Button>
              )}
            </div>

            <div className="bg-card rounded-xl p-4 space-y-3 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium">{manga.format}</span>
              </div>
              {manga.chapters && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Chapters</span>
                  <span className="font-medium">{manga.chapters}</span>
                </div>
              )}
              {manga.volumes && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Volumes</span>
                  <span className="font-medium">{manga.volumes}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">
                  {manga.status?.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              {manga.source && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium capitalize">
                    {manga.source.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
              )}
              {manga.averageScore && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-medium">{manga.averageScore}%</span>
                </div>
              )}
              {manga.popularity && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Popularity</span>
                  <span className="font-medium">
                    {manga.popularity.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Studios / Serialization */}
            {manga.studios && manga.studios.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2">Serialization</h4>
                <div className="flex flex-wrap gap-2">
                  {manga.studios.map((studio) => (
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
            {manga.externalLinks && manga.externalLinks.length > 0 && (
              <div className="bg-card rounded-xl p-4 space-y-2 border border-border">
                <h4 className="font-semibold text-sm mb-2">Links</h4>
                <div className="flex flex-wrap gap-2">
                  {manga.externalLinks.map((link) => (
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
                {manga.title.english || manga.title.romaji}
              </h1>
              {(manga.title.romaji &&
                manga.title.romaji !== manga.title.english) ||
              manga.title.native ? (
                <p className="text-sm text-muted-foreground italic">
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
            </div>

            {/* Description */}
            <div
              className="prose prose-zinc dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: manga.description }}
            />

            {/* Genres & Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Genres & Tags</h3>
              <div className="flex flex-wrap gap-2">
                {manga.genres?.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
                {manga.tags?.slice(0, 10).map((tag) => (
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

            {/* Staff */}
            {manga.staff && manga.staff.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Staff</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manga.staff.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between bg-card p-3 rounded-lg border border-border"
                    >
                      <p className="text-sm font-medium">{person.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {person.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Characters */}
            {manga.characters && manga.characters.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Characters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {manga.characters.slice(0, 10).map((char) => (
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
                        <p className="text-xs text-muted-foreground capitalize">
                          {char.role?.toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Relations */}
            {manga.relations && manga.relations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Relations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {manga.relations.map((relation) => {
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
                        key={relation.id}
                        href={href}
                        className="flex items-center justify-between bg-card p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {relation.title.english || relation.title.romaji}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {relation.format}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {relation.relationType.replace(/_/g, " ")}
                        </Badge>
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
