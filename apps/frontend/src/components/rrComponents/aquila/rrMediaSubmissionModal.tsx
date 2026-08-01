"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Upload, Plus, Trash2, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RrMediaSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType?: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  actionType?: "CREATE" | "EDIT";
  mediaId?: number;
  initialData?: Record<string, any>;
  onSuccess?: () => void;
}

const GENRE_OPTIONS: Record<string, string[]> = {
  anime: [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
  ],
  manga: [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
  ],
  tv: [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Mystery",
    "Reality",
    "Romance",
    "Sci-Fi",
    "Talk Show",
    "Thriller",
    "War",
    "Western",
  ],
  movie: [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Music",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "TV Movie",
    "Thriller",
    "War",
    "Western",
  ],
  game: [
    "Action",
    "Adventure",
    "Arcade",
    "Card",
    "Casual",
    "Fighting",
    "Indie",
    "Massively Multiplayer",
    "Platformer",
    "Puzzle",
    "Racing",
    "RPG",
    "Shooter",
    "Simulation",
    "Sports",
    "Strategy",
    "Tactical",
  ],
  book: [
    "Art",
    "Biography",
    "Business",
    "Children",
    "Comics",
    "Cooking",
    "Fiction",
    "Graphic Novels",
    "Health",
    "History",
    "Horror",
    "Memoir",
    "Mystery",
    "Non-Fiction",
    "Poetry",
    "Psychology",
    "Religion",
    "Romance",
    "Science",
    "Sci-Fi",
    "Self-Help",
    "Travel",
    "Young Adult",
  ],
};

const FORMAT_OPTIONS: Record<string, string[]> = {
  anime: [
    "TV",
    "TV_SHORT",
    "MOVIE",
    "SPECIAL",
    "OVA",
    "ONA",
    "MUSIC",
    "UNKNOWN",
  ],
  manga: ["MANGA", "NOVEL", "ONE_SHOT", "UNKNOWN"],
};

const STATUS_OPTIONS: Record<string, string[]> = {
  anime: ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED"],
  manga: ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED"],
  tv: ["Continuing", "Ended", "Upcoming", "Canceled"],
  movie: [
    "Released",
    "In Production",
    "Post Production",
    "Planned",
    "Canceled",
  ],
  game: ["Released", "Early Access", "In Development", "Cancelled"],
  book: ["Published", "Upcoming"],
};

export function RrMediaSubmissionModal({
  isOpen,
  onClose,
  mediaType: initialMediaType = "anime",
  actionType = "CREATE",
  mediaId,
  initialData = {},
  onSuccess,
}: RrMediaSubmissionModalProps): React.JSX.Element {
  const { data: session } = useSession();
  const [selectedMediaType, setSelectedMediaType] =
    useState<string>(initialMediaType);
  const [activeTab, setActiveTab] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synonymsList, setSynonymsList] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState("");

  // Characters & Staff state
  const [characterSearch, setCharacterSearch] = useState("");
  const [characterResults, setCharacterResults] = useState<any[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);

  // Relations state
  const [relationSearch, setRelationSearch] = useState("");
  const [relationResults, setRelationResults] = useState<any[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const activeType = initialMediaType || "anime";
      setSelectedMediaType(activeType);
      // Prefill initial data if editing or provided
      setFormData({
        titleEnglish:
          initialData?.titleEnglish ||
          initialData?.titleString ||
          initialData?.title?.english ||
          "",
        titleRomaji:
          initialData?.titleRomaji || initialData?.title?.romaji || "",
        titleNative:
          initialData?.titleNative || initialData?.title?.native || "",
        subtitle: initialData?.subtitle || "",
        description: initialData?.description || "",
        coverImage:
          initialData?.coverImageLarge || initialData?.coverImage || "",
        bannerImage:
          initialData?.bannerImage || initialData?.backgroundImage || "",
        format: initialData?.format || FORMAT_OPTIONS[activeType]?.[0] || "",
        status: initialData?.status || STATUS_OPTIONS[activeType]?.[0] || "",
        episodes: initialData?.episodes || "",
        duration:
          initialData?.duration ||
          initialData?.runtime ||
          initialData?.averageRuntime ||
          "",
        chapters: initialData?.chapters || "",
        volumes: initialData?.volumes || "",
        source: initialData?.source || "",
        season: initialData?.season || "SPRING",
        seasonYear: initialData?.seasonYear || new Date().getFullYear(),
        startDateYear:
          initialData?.startDateYear ||
          initialData?.releasedYear ||
          initialData?.publishedYear ||
          "",
        startDateMonth:
          initialData?.startDateMonth ||
          initialData?.releasedMonth ||
          initialData?.publishedMonth ||
          "",
        startDateDay:
          initialData?.startDateDay ||
          initialData?.releasedDay ||
          initialData?.publishedDay ||
          "",
        endDateYear: initialData?.endDateYear || "",
        endDateMonth: initialData?.endDateMonth || "",
        endDateDay: initialData?.endDateDay || "",
        isAdult:
          typeof initialData?.isAdult === "boolean"
            ? initialData.isAdult
            : false,
        hashtag: initialData?.hashtag || "",
        countryOfOrigin:
          initialData?.countryOfOrigin || initialData?.originalCountry || "JP",
        originalLanguage: initialData?.originalLanguage || "ja",
        contentRating:
          initialData?.contentRating || initialData?.esrbRating || "",
        publisher: initialData?.publisher || "",
        authors: Array.isArray(initialData?.authors)
          ? initialData.authors.join(", ")
          : "",
        artists: Array.isArray(initialData?.artists)
          ? initialData.artists.join(", ")
          : "",
        platforms: Array.isArray(initialData?.platforms)
          ? initialData.platforms.join(", ")
          : "",
        developers: Array.isArray(initialData?.developers)
          ? initialData.developers.join(", ")
          : "",
        publishers: Array.isArray(initialData?.publishers)
          ? initialData.publishers.join(", ")
          : "",
        isbn10: initialData?.isbn10 || "",
        isbn13: initialData?.isbn13 || "",
        pageCount: initialData?.pageCount || initialData?.pages || "",
      });

      setSelectedGenres(
        Array.isArray(initialData?.genres)
          ? initialData.genres
          : Array.isArray(initialData?.subjects)
            ? initialData.subjects
            : [],
      );
      setSynonymsList(
        Array.isArray(initialData?.synonyms) ? initialData.synonyms : [],
      );

      // Character prefill
      let charList: any[] = [];
      if (Array.isArray(initialData?.characters)) {
        charList = initialData.characters.map((c: any) => ({
          characterId: c.characterId || c.id || c.character?.id,
          name:
            c.name ||
            [
              c.nameFirst || c.character?.nameFirst,
              c.nameLast || c.character?.nameLast,
            ]
              .filter(Boolean)
              .join(" ") ||
            c.nameNative ||
            c.character?.nameNative ||
            "Character",
          role: c.role || "MAIN",
          image: c.image || c.coverImage || c.character?.image,
        }));
      } else if (Array.isArray(initialData?.characters?.edges)) {
        charList = initialData.characters.edges.map((e: any) => ({
          characterId: e.node?.id,
          name:
            e.node?.name?.userPreferred ||
            [e.node?.name?.first, e.node?.name?.last]
              .filter(Boolean)
              .join(" ") ||
            "Character",
          role: e.role || "MAIN",
          image: e.node?.image?.large || e.node?.image?.medium,
        }));
      } else if (Array.isArray(initialData?.animeCharacters)) {
        charList = initialData.animeCharacters.map((ac: any) => ({
          characterId: ac.characterId || ac.character?.id,
          name:
            [ac.character?.nameFirst, ac.character?.nameLast]
              .filter(Boolean)
              .join(" ") ||
            ac.character?.nameNative ||
            "Character",
          role: ac.role || "MAIN",
          image: ac.character?.image,
        }));
      } else if (Array.isArray(initialData?.mangaCharacters)) {
        charList = initialData.mangaCharacters.map((mc: any) => ({
          characterId: mc.characterId || mc.character?.id,
          name:
            [mc.character?.nameFirst, mc.character?.nameLast]
              .filter(Boolean)
              .join(" ") ||
            mc.character?.nameNative ||
            "Character",
          role: mc.role || "MAIN",
          image: mc.character?.image,
        }));
      }
      setSelectedCharacters(charList);

      // Helper for robust title string parsing
      const parseRelationTitle = (item: any): string => {
        if (!item) return "Related Media";
        if (typeof item.title === "string" && item.title) return item.title;
        if (typeof item.title === "object" && item.title) {
          return (
            item.title.english ||
            item.title.romaji ||
            item.title.native ||
            item.title.userPreferred ||
            "Related Media"
          );
        }
        return (
          item.titleEnglish ||
          item.titleRomaji ||
          item.titleNative ||
          item.titleString ||
          item.node?.title?.userPreferred ||
          item.node?.title?.english ||
          item.node?.title?.romaji ||
          "Related Media"
        );
      };

      // Relation prefill
      let relList: any[] = [];
      if (Array.isArray(initialData?.relations)) {
        relList = initialData.relations.map((r: any) => ({
          relatedMediaId:
            r.relatedMediaId || r.id || r.relatedAnimeId || r.relatedMangaId,
          title: parseRelationTitle(r),
          relationType: r.relationType || "SEQUEL",
          image:
            r.image ||
            r.coverImage ||
            r.coverImageLarge ||
            r.node?.coverImage?.large,
        }));
      } else if (Array.isArray(initialData?.relations?.edges)) {
        relList = initialData.relations.edges.map((e: any) => ({
          relatedMediaId: e.node?.id,
          title: parseRelationTitle(e.node),
          relationType: e.relationType || "SEQUEL",
          image: e.node?.coverImage?.large || e.node?.coverImage?.medium,
        }));
      } else if (Array.isArray(initialData?.animeRelations)) {
        relList = initialData.animeRelations.map((ar: any) => ({
          relatedMediaId:
            ar.relatedAnimeId ||
            ar.relatedMangaId ||
            ar.relatedAnime?.id ||
            ar.relatedManga?.id,
          title: parseRelationTitle(ar.relatedAnime || ar.relatedManga),
          relationType: ar.relationType || "SEQUEL",
          image:
            ar.relatedAnime?.coverImageLarge ||
            ar.relatedManga?.coverImageLarge,
        }));
      } else if (Array.isArray(initialData?.mangaRelations)) {
        relList = initialData.mangaRelations.map((mr: any) => ({
          relatedMediaId:
            mr.relatedMangaId ||
            mr.relatedAnimeId ||
            mr.relatedManga?.id ||
            mr.relatedAnime?.id,
          title: parseRelationTitle(mr.relatedManga || mr.relatedAnime),
          relationType: mr.relationType || "SEQUEL",
          image:
            mr.relatedManga?.coverImageLarge ||
            mr.relatedAnime?.coverImageLarge,
        }));
      }
      setSelectedRelations(relList);
    }
  }, [isOpen, mediaId, initialMediaType]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const handleAddSynonym = () => {
    if (newSynonym.trim() && !synonymsList.includes(newSynonym.trim())) {
      setSynonymsList((prev) => [...prev, newSynonym.trim()]);
      setNewSynonym("");
    }
  };

  const handleRemoveSynonym = (syn: string) => {
    setSynonymsList((prev) => prev.filter((s) => s !== syn));
  };

  // Image Upload helper
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "coverImage" | "bannerImage",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCover = field === "coverImage";
    if (isCover) setIsUploadingCover(true);
    else setIsUploadingBanner(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/public/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: uploadData,
        },
      );

      if (!res.ok) throw new Error("Failed to upload image");
      const json = await res.json();
      const imageUrl = json.url;

      handleChange(field, imageUrl);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      if (isCover) setIsUploadingCover(false);
      else setIsUploadingBanner(false);
    }
  };

  // Explicit onSubmit search handlers
  const handleCharacterSearchSubmit = async () => {
    if (!characterSearch.trim()) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/characters?q=${encodeURIComponent(
          characterSearch.trim(),
        )}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCharacterResults(data);
      }
    } catch {
      // silent search error
    }
  };

  const handleRelationSearchSubmit = async () => {
    if (!relationSearch.trim()) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/relations?mediaType=${selectedMediaType}&q=${encodeURIComponent(
          relationSearch.trim(),
        )}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRelationResults(data);
      }
    } catch {
      // silent search error
    }
  };

  const handleSubmit = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to submit media edits or additions.");
      return;
    }

    if (
      !formData.titleEnglish &&
      !formData.titleRomaji &&
      !formData.titleNative
    ) {
      toast.error("Please provide at least one title.");
      return;
    }

    setIsSubmitting(true);

    const payloadData = {
      ...formData,
      genres: selectedGenres,
      subjects: selectedGenres,
      synonyms: synonymsList,
      authors: formData.authors
        ? formData.authors
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      artists: formData.artists
        ? formData.artists
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      platforms: formData.platforms
        ? formData.platforms
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      developers: formData.developers
        ? formData.developers
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      publishers: formData.publishers
        ? formData.publishers
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      characters: selectedCharacters,
      relations: selectedRelations,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            mediaType: selectedMediaType,
            actionType,
            mediaId: mediaId ? Number(mediaId) : undefined,
            data: payloadData,
          }),
        },
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Failed to submit media data");
      }

      const responseData = await res.json();
      if (responseData.appliedDirectly) {
        toast.success("Media data updated directly to the database!");
      } else {
        toast.success("Submission sent! Awaiting administrator approval.");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw]! max-w-250! sm:max-w-250! h-[88vh]! max-h-225! flex flex-col p-0 gap-0 overflow-hidden bg-background/90 backdrop-blur-2xl border border-border/60 rounded-3xl shadow-2xl text-foreground [&>button]:text-foreground [&>button]:z-60">
        <DialogHeader className="p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Sparkles className="size-5 text-primary" />
                {actionType === "EDIT"
                  ? "Edit Media Metadata"
                  : "Add New Media Entry"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {actionType === "EDIT"
                  ? "Propose edits to this media metadata. Changes are reviewed by administrators or applied directly if you hold management permissions."
                  : "Submit a new media title to the Aquila database."}
              </DialogDescription>
            </div>
            {actionType === "CREATE" && (
              <Select
                value={selectedMediaType}
                onValueChange={(val) => setSelectedMediaType(val)}
              >
                <SelectTrigger className="w-35 h-10 text-xs font-bold capitalize bg-background/80 border-border/70 rounded-xl shadow-2xs cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/70 rounded-xl">
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="manga">Manga</SelectItem>
                  <SelectItem value="tv">TV Show</SelectItem>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-3 pb-3 border-b border-border/50 bg-muted/15">
            <TabsList className="flex items-center justify-start gap-1.5 h-11 bg-muted/60 p-1 rounded-xl w-full overflow-x-auto border border-border/50 shadow-2xs">
              <TabsTrigger
                value="general"
                className="px-4 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="px-4 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                Images & Links
              </TabsTrigger>
              <TabsTrigger
                value="genres"
                className="px-4 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                Genres & Tags
              </TabsTrigger>
              <TabsTrigger
                value="characters"
                className="px-4 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                Characters & Staff
              </TabsTrigger>
              <TabsTrigger
                value="relations"
                className="px-4 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                Relations
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {/* 1. General Tab */}
            <TabsContent value="general" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Title (English)
                  </Label>
                  <Input
                    placeholder="e.g. Frieren: Beyond Journey's End"
                    value={formData.titleEnglish || ""}
                    onChange={(e) =>
                      handleChange("titleEnglish", e.target.value)
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Title (Romaji)
                  </Label>
                  <Input
                    placeholder="e.g. Sousou no Frieren"
                    value={formData.titleRomaji || ""}
                    onChange={(e) =>
                      handleChange("titleRomaji", e.target.value)
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Title (Native)
                  </Label>
                  <Input
                    placeholder="e.g. 葬送のフリーレン"
                    value={formData.titleNative || ""}
                    onChange={(e) =>
                      handleChange("titleNative", e.target.value)
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Description
                </Label>
                <Textarea
                  rows={4}
                  placeholder="Enter synopsis or media description..."
                  value={formData.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="bg-background/80 border-border/70 rounded-xl text-xs font-medium p-3 focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {FORMAT_OPTIONS[selectedMediaType] && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Format
                    </Label>
                    <Select
                      value={
                        formData.format || FORMAT_OPTIONS[selectedMediaType][0]
                      }
                      onValueChange={(v) => handleChange("format", v)}
                    >
                      <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                        {FORMAT_OPTIONS[selectedMediaType].map((fmt) => (
                          <SelectItem key={fmt} value={fmt}>
                            {fmt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {STATUS_OPTIONS[selectedMediaType] && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Status
                    </Label>
                    <Select
                      value={
                        formData.status || STATUS_OPTIONS[selectedMediaType][0]
                      }
                      onValueChange={(v) => handleChange("status", v)}
                    >
                      <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                        {STATUS_OPTIONS[selectedMediaType].map((st) => (
                          <SelectItem key={st} value={st}>
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selectedMediaType === "anime" ||
                  selectedMediaType === "manga" ||
                  selectedMediaType === "book") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {selectedMediaType === "anime"
                        ? "Episodes"
                        : selectedMediaType === "manga"
                          ? "Chapters"
                          : "Pages"}
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 28"
                      value={
                        selectedMediaType === "anime"
                          ? formData.episodes || ""
                          : selectedMediaType === "manga"
                            ? formData.chapters || ""
                            : formData.pageCount || ""
                      }
                      onChange={(e) =>
                        handleChange(
                          selectedMediaType === "anime"
                            ? "episodes"
                            : selectedMediaType === "manga"
                              ? "chapters"
                              : "pageCount",
                          e.target.value,
                        )
                      }
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                )}

                {(selectedMediaType === "anime" ||
                  selectedMediaType === "tv" ||
                  selectedMediaType === "movie") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Duration (mins)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 24"
                      value={formData.duration || ""}
                      onChange={(e) => handleChange("duration", e.target.value)}
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                )}

                {selectedMediaType === "manga" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Volumes
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={formData.volumes || ""}
                      onChange={(e) => handleChange("volumes", e.target.value)}
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                  </div>
                )}

                {(selectedMediaType === "anime" ||
                  selectedMediaType === "manga") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Source
                    </Label>
                    <Select
                      value={formData.source || "ORIGINAL"}
                      onValueChange={(v) => handleChange("source", v)}
                    >
                      <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                        <SelectItem value="ORIGINAL">Original</SelectItem>
                        <SelectItem value="MANGA">Manga</SelectItem>
                        <SelectItem value="LIGHT_NOVEL">Light Novel</SelectItem>
                        <SelectItem value="VISUAL_NOVEL">
                          Visual Novel
                        </SelectItem>
                        <SelectItem value="GAME">Game</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedMediaType === "anime" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Season
                      </Label>
                      <Select
                        value={formData.season || "SPRING"}
                        onValueChange={(v) => handleChange("season", v)}
                      >
                        <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                          <SelectItem value="WINTER">Winter</SelectItem>
                          <SelectItem value="SPRING">Spring</SelectItem>
                          <SelectItem value="SUMMER">Summer</SelectItem>
                          <SelectItem value="FALL">Fall</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Season Year
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2024"
                        value={formData.seasonYear || ""}
                        onChange={(e) =>
                          handleChange("seasonYear", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Start & End Dates */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Start Date
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Year
                    </Label>
                    <Input
                      type="number"
                      placeholder="YYYY"
                      value={formData.startDateYear || ""}
                      onChange={(e) =>
                        handleChange("startDateYear", e.target.value)
                      }
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Month
                    </Label>
                    <Input
                      type="number"
                      placeholder="1-12"
                      value={formData.startDateMonth || ""}
                      onChange={(e) =>
                        handleChange("startDateMonth", e.target.value)
                      }
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Day
                    </Label>
                    <Input
                      type="number"
                      placeholder="1-31"
                      value={formData.startDateDay || ""}
                      onChange={(e) =>
                        handleChange("startDateDay", e.target.value)
                      }
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {(selectedMediaType === "anime" ||
                selectedMediaType === "manga") && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    End Date
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Year
                      </Label>
                      <Input
                        type="number"
                        placeholder="YYYY"
                        value={formData.endDateYear || ""}
                        onChange={(e) =>
                          handleChange("endDateYear", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Month
                      </Label>
                      <Input
                        type="number"
                        placeholder="1-12"
                        value={formData.endDateMonth || ""}
                        onChange={(e) =>
                          handleChange("endDateMonth", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">
                        Day
                      </Label>
                      <Input
                        type="number"
                        placeholder="1-31"
                        value={formData.endDateDay || ""}
                        onChange={(e) =>
                          handleChange("endDateDay", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Extra Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Country of Origin
                  </Label>
                  <Input
                    placeholder="e.g. JP, US, KR"
                    value={
                      formData.countryOfOrigin || formData.originalCountry || ""
                    }
                    onChange={(e) =>
                      handleChange("countryOfOrigin", e.target.value)
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                </div>

                {(selectedMediaType === "anime" ||
                  selectedMediaType === "manga") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Hashtag
                    </Label>
                    <Input
                      placeholder="e.g. #frieren"
                      value={formData.hashtag || ""}
                      onChange={(e) => handleChange("hashtag", e.target.value)}
                      className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                )}

                {selectedMediaType === "book" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Authors (comma separated)
                      </Label>
                      <Input
                        placeholder="e.g. J.K. Rowling"
                        value={formData.authors || ""}
                        onChange={(e) =>
                          handleChange("authors", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Publishers
                      </Label>
                      <Input
                        placeholder="e.g. Bloomsbury"
                        value={formData.publishers || ""}
                        onChange={(e) =>
                          handleChange("publishers", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        ISBN-10
                      </Label>
                      <Input
                        placeholder="e.g. 0747532699"
                        value={formData.isbn10 || ""}
                        onChange={(e) => handleChange("isbn10", e.target.value)}
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        ISBN-13
                      </Label>
                      <Input
                        placeholder="e.g. 9780747532699"
                        value={formData.isbn13 || ""}
                        onChange={(e) => handleChange("isbn13", e.target.value)}
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                  </>
                )}

                {selectedMediaType === "game" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Developers
                      </Label>
                      <Input
                        placeholder="e.g. FromSoftware"
                        value={formData.developers || ""}
                        onChange={(e) =>
                          handleChange("developers", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Publishers
                      </Label>
                      <Input
                        placeholder="e.g. Bandai Namco"
                        value={formData.publishers || ""}
                        onChange={(e) =>
                          handleChange("publishers", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Platforms
                      </Label>
                      <Input
                        placeholder="e.g. PC, PS5, Xbox Series X"
                        value={formData.platforms || ""}
                        onChange={(e) =>
                          handleChange("platforms", e.target.value)
                        }
                        className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                      />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* 2. Images & Links Tab */}
            <TabsContent value="images" className="m-0 space-y-5">
              {/* Cover Image */}
              <div className="space-y-2 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cover Image
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste external image URL (https://...)"
                    value={formData.coverImage || ""}
                    onChange={(e) => handleChange("coverImage", e.target.value)}
                    className="flex-1 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-10 rounded-xl border-border/70 font-bold"
                      disabled={isUploadingCover}
                    >
                      {isUploadingCover ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      Upload File
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "coverImage")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                {formData.coverImage && (
                  <div className="mt-3 w-28 h-40 rounded-2xl overflow-hidden border border-border/60 shadow-lg relative group">
                    <img
                      src={formData.coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Banner Image */}
              <div className="space-y-2 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Banner Image
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste external banner URL (https://...)"
                    value={formData.bannerImage || ""}
                    onChange={(e) =>
                      handleChange("bannerImage", e.target.value)
                    }
                    className="flex-1 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-10 rounded-xl border-border/70 font-bold"
                      disabled={isUploadingBanner}
                    >
                      {isUploadingBanner ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      Upload File
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "bannerImage")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                {formData.bannerImage && (
                  <div className="mt-3 w-full h-28 rounded-2xl overflow-hidden border border-border/60 shadow-lg relative group">
                    <img
                      src={formData.bannerImage}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 3. Genres & Tags Tab */}
            <TabsContent value="genres" className="m-0 space-y-4">
              <div className="space-y-2 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Genres
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(
                    GENRE_OPTIONS[selectedMediaType] || GENRE_OPTIONS.anime
                  ).map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <Badge
                        key={genre}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-xs font-bold px-3 py-1 rounded-full transition-all hover:scale-105 shadow-2xs",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                            : "bg-background/80 border-border/70 text-foreground hover:bg-muted",
                        )}
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Synonyms */}
              <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Alternative Titles / Synonyms
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add synonym title..."
                    value={newSynonym}
                    onChange={(e) => setNewSynonym(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddSynonym())
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddSynonym}
                    className="h-10 px-4 rounded-xl font-bold"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {synonymsList.map((syn) => (
                    <Badge
                      key={syn}
                      variant="secondary"
                      className="gap-1.5 text-xs font-semibold py-1 px-3 rounded-xl bg-background border border-border/70"
                    >
                      {syn}
                      <Trash2
                        className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveSynonym(syn)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 4. Characters Tab */}
            <TabsContent value="characters" className="m-0 space-y-4">
              <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attach Character from Database
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Type name & click search or press Enter..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleCharacterSearchSubmit())
                      }
                      className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleCharacterSearchSubmit}
                    className="gap-1.5 text-xs h-10 px-4 rounded-xl font-bold"
                  >
                    <Search className="size-3.5" />
                    Search
                  </Button>
                </div>

                {characterResults.length > 0 && (
                  <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar shadow-md">
                    {characterResults.map((char) => {
                      const fullName =
                        [char.nameFirst, char.nameMiddle, char.nameLast]
                          .filter(Boolean)
                          .join(" ") ||
                        char.nameNative ||
                        "Character";
                      return (
                        <div
                          key={char.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 text-xs cursor-pointer gap-3 transition-colors"
                          onClick={() => {
                            if (
                              !selectedCharacters.some(
                                (c) => c.characterId === char.id,
                              )
                            ) {
                              setSelectedCharacters((prev) => [
                                ...prev,
                                {
                                  characterId: char.id,
                                  name: fullName,
                                  role: "MAIN",
                                  image: char.image,
                                },
                              ]);
                            }
                            setCharacterSearch("");
                            setCharacterResults([]);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {char.image ? (
                              <img
                                src={char.image}
                                alt={fullName}
                                className="size-9 rounded-full object-cover shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs shrink-0 font-bold">
                                {fullName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate">
                                {fullName}
                              </p>
                              {char.nameNative && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {char.nameNative}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold rounded-lg bg-primary/10 text-primary border-primary/20"
                          >
                            Add
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Characters */}
              <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Selected Characters ({selectedCharacters.length})
                </Label>
                <div className="space-y-2">
                  {selectedCharacters.map((char, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/80 text-xs gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {char.image ? (
                          <img
                            src={char.image}
                            alt={char.name}
                            className="size-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs shrink-0 font-bold">
                            {char.name?.charAt(0) || "C"}
                          </div>
                        )}
                        <span className="font-bold text-foreground truncate">
                          {char.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={char.role}
                          onValueChange={(val) => {
                            const updated = [...selectedCharacters];
                            updated[index].role = val;
                            setSelectedCharacters(updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold w-30 bg-background border-border/70 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MAIN">MAIN</SelectItem>
                            <SelectItem value="SUPPORTING">
                              SUPPORTING
                            </SelectItem>
                            <SelectItem value="BACKGROUND">
                              BACKGROUND
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() =>
                            setSelectedCharacters((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 5. Relations Tab */}
            <TabsContent value="relations" className="m-0 space-y-4">
              <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Search Related Media
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Type title & click search or press Enter..."
                      value={relationSearch}
                      onChange={(e) => setRelationSearch(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), handleRelationSearchSubmit())
                      }
                      className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleRelationSearchSubmit}
                    className="gap-1.5 text-xs h-10 px-4 rounded-xl font-bold"
                  >
                    <Search className="size-3.5" />
                    Search
                  </Button>
                </div>

                {relationResults.length > 0 && (
                  <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar shadow-md">
                    {relationResults.map((rel) => {
                      const title =
                        rel.titleEnglish ||
                        rel.titleRomaji ||
                        rel.titleString ||
                        "Media";
                      const img = rel.coverImageLarge || rel.coverImage;
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/60 text-xs cursor-pointer gap-3 transition-colors"
                          onClick={() => {
                            if (
                              !selectedRelations.some(
                                (r) => r.relatedMediaId === rel.id,
                              )
                            ) {
                              setSelectedRelations((prev) => [
                                ...prev,
                                {
                                  relatedMediaId: rel.id,
                                  title,
                                  relationType: "SEQUEL",
                                  image: img,
                                },
                              ]);
                            }
                            setRelationSearch("");
                            setRelationResults([]);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {img ? (
                              <img
                                src={img}
                                alt={title}
                                className="w-7 h-10 rounded-md object-cover shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-7 h-10 rounded-md bg-muted flex items-center justify-center text-[10px] shrink-0 font-bold">
                                M
                              </div>
                            )}
                            <span className="font-bold text-foreground truncate">
                              {title}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold rounded-lg bg-primary/10 text-primary border-primary/20"
                          >
                            Add
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Relations */}
              <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Selected Relations ({selectedRelations.length})
                </Label>
                <div className="space-y-2">
                  {selectedRelations.map((rel, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/80 text-xs gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {rel.image ? (
                          <img
                            src={rel.image}
                            alt={rel.title}
                            className="w-7 h-10 rounded-md object-cover shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-7 h-10 rounded-md bg-muted flex items-center justify-center text-[10px] shrink-0 font-bold">
                            M
                          </div>
                        )}
                        <span className="font-bold text-foreground truncate max-w-50">
                          {rel.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={rel.relationType}
                          onValueChange={(val) => {
                            const updated = [...selectedRelations];
                            updated[index].relationType = val;
                            setSelectedRelations(updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold w-35 bg-background border-border/70 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEQUEL">SEQUEL</SelectItem>
                            <SelectItem value="PREQUEL">PREQUEL</SelectItem>
                            <SelectItem value="ADAPTATION">
                              ADAPTATION
                            </SelectItem>
                            <SelectItem value="SIDE_STORY">
                              SIDE_STORY
                            </SelectItem>
                            <SelectItem value="SPIN_OFF">SPIN_OFF</SelectItem>
                            <SelectItem value="ALTERNATIVE">
                              ALTERNATIVE
                            </SelectItem>
                            <SelectItem value="OTHER">OTHER</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() =>
                            setSelectedRelations((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 sm:px-6 border-t border-border/50 flex items-center justify-between bg-muted/20 backdrop-blur-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-bold hover:bg-muted/60"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 rounded-xl px-5 h-10 text-xs"
          >
            {isSubmitting && <Spinner className="size-4" />}
            {actionType === "EDIT" ? "Submit Edits" : "Create Media Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
