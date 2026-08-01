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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Sparkles, Info, Calendar, ImageIcon, Tag, Database, Users } from "lucide-react";

import { RrSubmissionBasicTab } from "./submission/rrSubmissionBasicTab";
import { RrSubmissionReleaseTab } from "./submission/rrSubmissionReleaseTab";
import { RrSubmissionAssetsTab } from "./submission/rrSubmissionAssetsTab";
import { RrSubmissionTaxonomyTab } from "./submission/rrSubmissionTaxonomyTab";
import { RrSubmissionExternalIdsTab } from "./submission/rrSubmissionExternalIdsTab";
import { RrSubmissionPeopleTab } from "./submission/rrSubmissionPeopleTab";

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
  anime: ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC", "UNKNOWN"],
  manga: ["MANGA", "NOVEL", "LIGHT_NOVEL", "ONE_SHOT", "MANHWA", "MANHUA", "UNKNOWN"],
  tv: ["Scripted", "Animation", "Reality", "Documentary", "Talk Show", "News"],
  movie: ["Theatrical", "Direct to Video", "TV Movie", "Short"],
  game: ["Full Game", "DLC", "Expansion", "Mod"],
  book: ["Hardcover", "Paperback", "eBook", "Audiobook"],
};

const STATUS_OPTIONS: Record<string, string[]> = {
  anime: ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS", "UNKNOWN"],
  manga: ["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS", "UNKNOWN"],
  tv: ["RETURNING_SERIES", "ENDED", "CANCELED", "IN_PRODUCTION", "UPCOMING", "UNKNOWN"],
  movie: ["RELEASED", "IN_PRODUCTION", "POST_PRODUCTION", "RUMORED", "CANCELLED", "UNKNOWN"],
  game: ["RELEASED", "EARLY_ACCESS", "ANNOUNCED", "IN_DEVELOPMENT", "DELAYED", "CANCELLED", "UNKNOWN"],
  book: ["PUBLISHED", "RELEASING", "CANCELLED", "ON_HIATUS", "UNKNOWN"],
};

const SOURCE_OPTIONS: Record<string, string[]> = {
  anime: [
    "ORIGINAL",
    "MANGA",
    "LIGHT_NOVEL",
    "VISUAL_NOVEL",
    "VIDEO_GAME",
    "OTHER",
    "NOVEL",
    "DOUJINSHI",
    "ANIME",
    "WEB_NOVEL",
    "LIVE_ACTION",
    "GAME",
    "COMIC",
    "MULTIMEDIA_PROJECT",
    "PICTURE_BOOK",
    "UNKNOWN",
  ],
  manga: [
    "ORIGINAL",
    "MANGA",
    "LIGHT_NOVEL",
    "VISUAL_NOVEL",
    "VIDEO_GAME",
    "OTHER",
    "NOVEL",
    "WEB_NOVEL",
    "UNKNOWN",
  ],
  tv: ["Original", "Novel", "Book", "Comic", "Game", "True Story"],
  movie: ["Original", "Book", "Comic", "Play", "Game", "Real Life"],
  game: ["Original", "Book", "Anime", "Movie", "Manga"],
  book: ["Original", "Folklore", "Historical Events"],
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
  const [selectedMediaType, setSelectedMediaType] = useState<string>(initialMediaType);
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synonymsList, setSynonymsList] = useState<string[]>([]);

  // Attached Entities
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any[]>([]);
  const [selectedStudios, setSelectedStudios] = useState<any[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const activeType = initialMediaType || "anime";
      setSelectedMediaType(activeType);

      // Prefill initial data
      setFormData({
        titlePrimary:
          initialData?.titlePrimary ||
          initialData?.titleEnglish ||
          initialData?.titleString ||
          initialData?.title?.english ||
          "",
        titleEnglish:
          initialData?.titleEnglish ||
          initialData?.titlePrimary ||
          initialData?.titleString ||
          initialData?.title?.english ||
          "",
        titleSecondary:
          initialData?.titleSecondary ||
          initialData?.titleRomaji ||
          initialData?.title?.romaji ||
          "",
        titleRomaji:
          initialData?.titleRomaji ||
          initialData?.titleSecondary ||
          initialData?.title?.romaji ||
          "",
        titleNative:
          initialData?.titleNative || initialData?.title?.native || "",
        tagline: initialData?.tagline || "",
        subtitle: initialData?.subtitle || "",
        description: initialData?.description || "",
        coverImage:
          initialData?.coverImageLarge || initialData?.coverImage || "",
        bannerImage:
          initialData?.bannerImage || initialData?.backgroundImage || "",
        backgroundImage:
          initialData?.backgroundImage || initialData?.bannerImage || "",
        format: initialData?.format || FORMAT_OPTIONS[activeType]?.[0] || "",
        status: initialData?.status || STATUS_OPTIONS[activeType]?.[0] || "",
        source: initialData?.source || SOURCE_OPTIONS[activeType]?.[0] || "",
        episodes: initialData?.episodes || initialData?.episodeCount || "",
        episodeCount: initialData?.episodeCount || initialData?.episodes || "",
        duration:
          initialData?.duration ||
          initialData?.runtime ||
          initialData?.averageRuntime ||
          "",
        runtime:
          initialData?.runtime ||
          initialData?.duration ||
          initialData?.averageRuntime ||
          "",
        chapters: initialData?.chapters || initialData?.chapterCount || "",
        volumes: initialData?.volumes || initialData?.volumeCount || "",
        pageCount: initialData?.pageCount || initialData?.pages || "",
        season: initialData?.season || initialData?.seasonSeason || "SPRING",
        seasonYear: initialData?.seasonYear || new Date().getFullYear(),
        startDateYear:
          initialData?.startDateYear ||
          initialData?.firstAiredYear ||
          initialData?.releaseDateYear ||
          "",
        startDateMonth:
          initialData?.startDateMonth ||
          initialData?.firstAiredMonth ||
          initialData?.releaseDateMonth ||
          "",
        startDateDay:
          initialData?.startDateDay ||
          initialData?.firstAiredDay ||
          initialData?.releaseDateDay ||
          "",
        endDateYear: initialData?.endDateYear || initialData?.lastAiredYear || "",
        endDateMonth: initialData?.endDateMonth || initialData?.lastAiredMonth || "",
        endDateDay: initialData?.endDateDay || initialData?.lastAiredDay || "",
        isAdult:
          typeof initialData?.isAdult === "boolean"
            ? initialData.isAdult
            : false,
        hashtag: initialData?.hashtag || "",
        countryOfOrigin:
          initialData?.countryOfOrigin || initialData?.originalCountry || "JP",
        originalLanguage: initialData?.originalLanguage || "ja",
        ageRating:
          initialData?.ageRating || initialData?.esrbRating || "",
        ageRatingGuide: initialData?.ageRatingGuide || "",
        website: initialData?.website || initialData?.homepage || "",
        siteUrl: initialData?.siteUrl || "",
        budget: initialData?.budget || "",
        revenue: initialData?.revenue || initialData?.boxOffice || "",
        hltbMainStory: initialData?.hltbMainStory || "",
        hltbExtraStory: initialData?.hltbExtraStory || "",
        hltbCompletionist: initialData?.hltbCompletionist || "",
        series: initialData?.series || "",
        seriesPosition: initialData?.seriesPosition || "",
        isbn10: initialData?.isbn10 || "",
        isbn13: initialData?.isbn13 || "",
        retailPrice: initialData?.retailPrice || "",
        retailPriceCurrency: initialData?.retailPriceCurrency || "USD",
        anilistId: initialData?.anilistId || "",
        malId: initialData?.malId || "",
        aniDBId: initialData?.aniDBId || "",
        tvDBId: initialData?.tvDBId || initialData?.tvdbId || "",
        imdbId: initialData?.imdbId || "",
        tmdbId: initialData?.tmdbId || "",
        traktId: initialData?.traktId || "",
        rawgId: initialData?.rawgId || "",
        igdbId: initialData?.igdbId || "",
        steamAppId: initialData?.steamAppId || "",
        googleBookId: initialData?.googleBookId || "",
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

      // Prefill Characters
      let charList: any[] = [];
      if (Array.isArray(initialData?.characters)) {
        charList = initialData.characters.map((c: any) => ({
          characterId: c.characterId || c.id || c.character?.id,
          name:
            c.name ||
            c.namePrimary ||
            [
              c.nameFirst || c.character?.nameFirst,
              c.nameLast || c.character?.nameLast,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Character",
          role: c.role || "MAIN",
          image: c.image || c.coverImage || c.character?.image,
        }));
      }
      setSelectedCharacters(charList);

      // Prefill Staff
      let staffList: any[] = [];
      if (Array.isArray(initialData?.staff)) {
        staffList = initialData.staff.map((s: any) => ({
          staffId: s.staffId || s.id || s.actorId,
          name: s.name || s.namePrimary || s.staff?.namePrimary || "Staff",
          role: s.role || "DIRECTOR",
          image: s.image || s.staff?.image,
        }));
      }
      setSelectedStaff(staffList);

      // Prefill Studios
      let studioList: any[] = [];
      if (Array.isArray(initialData?.studiosList) || Array.isArray(initialData?.studiosData)) {
        const rawStudios = initialData.studiosList || initialData.studiosData;
        studioList = rawStudios.map((st: any) => ({
          studioId: st.studioId || st.id,
          name: st.name || st.studio?.name || "Studio",
          isMain: typeof st.isMain === "boolean" ? st.isMain : true,
        }));
      }
      setSelectedStudios(studioList);

      // Prefill Relations
      let relList: any[] = [];
      if (Array.isArray(initialData?.relations)) {
        relList = initialData.relations.map((r: any) => ({
          relatedMediaId: r.relatedMediaId || r.id,
          title:
            typeof r.title === "string"
              ? r.title
              : r.titlePrimary || r.titleEnglish || "Related Media",
          relationType: r.relationType || "SEQUEL",
          image: r.image || r.coverImage,
        }));
      }
      setSelectedRelations(relList);
    }
  }, [isOpen, mediaId, initialMediaType]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const handleAddSynonym = (syn: string) => {
    if (syn.trim() && !synonymsList.includes(syn.trim())) {
      setSynonymsList((prev) => [...prev, syn.trim()]);
    }
  };

  const handleRemoveSynonym = (syn: string) => {
    setSynonymsList((prev) => prev.filter((s) => s !== syn));
  };

  // Image Upload Handler
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "coverImage" | "bannerImage" | "backgroundImage",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "coverImage") setIsUploadingCover(true);
    else if (field === "bannerImage") setIsUploadingBanner(true);
    else setIsUploadingBackground(true);

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
      if (field === "coverImage") setIsUploadingCover(false);
      else if (field === "bannerImage") setIsUploadingBanner(false);
      else setIsUploadingBackground(false);
    }
  };

  // Backend Search Helpers
  const handleSearchCharacters = async (query: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/characters?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) return await res.json();
    } catch {
      // silent
    }
    return [];
  };

  const handleSearchStaff = async (query: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/actors?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) return await res.json();
    } catch {
      // silent
    }
    return [];
  };

  const handleSearchStudios = async (query: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/studios?q=${encodeURIComponent(query)}`,
      );
      if (res.ok) return await res.json();
    } catch {
      // silent
    }
    return [];
  };

  const handleSearchRelations = async (query: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/relations?mediaType=${selectedMediaType}&q=${encodeURIComponent(query)}`,
      );
      if (res.ok) return await res.json();
    } catch {
      // silent
    }
    return [];
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to submit media edits or additions.");
      return;
    }

    if (
      !formData.titleEnglish &&
      !formData.titlePrimary &&
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
      characters: selectedCharacters,
      staff: selectedStaff,
      studiosList: selectedStudios,
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
      <DialogContent className="w-[94vw]! max-w-280! sm:max-w-280! h-[90vh]! max-h-240! flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-2xl border border-border/60 rounded-3xl shadow-2xl text-foreground [&>button]:text-foreground [&>button]:z-60">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Sparkles className="size-5 text-primary" />
                {actionType === "EDIT"
                  ? "Edit Media Metadata (V2)"
                  : "Add New Media Entry (V2)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {actionType === "EDIT"
                  ? "Propose metadata edits to the Aquila database. Edits will be applied directly if you hold management permissions."
                  : "Submit a new media entry into the Aquila V2 database."}
              </DialogDescription>
            </div>

            {actionType === "CREATE" && (
              <Select
                value={selectedMediaType}
                onValueChange={(val) => setSelectedMediaType(val)}
              >
                <SelectTrigger className="w-36 h-10 text-xs font-bold capitalize bg-background/80 border-border/70 rounded-xl shadow-2xs cursor-pointer">
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

        {/* Modular Tabs Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-3 pb-3 border-b border-border/50 bg-muted/15">
            <TabsList className="flex items-center justify-start gap-1 h-11 bg-muted/60 p-1 rounded-xl w-full overflow-x-auto border border-border/50 shadow-2xs">
              <TabsTrigger
                value="basic"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Info className="size-3.5" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger
                value="release"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Calendar className="size-3.5" />
                Release & Specs
              </TabsTrigger>
              <TabsTrigger
                value="assets"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <ImageIcon className="size-3.5" />
                Media Assets
              </TabsTrigger>
              <TabsTrigger
                value="taxonomy"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Tag className="size-3.5" />
                Taxonomy & Ratings
              </TabsTrigger>
              <TabsTrigger
                value="external"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Database className="size-3.5" />
                External IDs
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="gap-1.5 px-3.5 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs whitespace-nowrap"
              >
                <Users className="size-3.5" />
                People & Production
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {/* 1. Basic Info */}
            <TabsContent value="basic" className="m-0">
              <RrSubmissionBasicTab
                mediaType={selectedMediaType}
                formData={formData}
                onChange={handleChange}
                formatOptions={FORMAT_OPTIONS[selectedMediaType] || []}
                statusOptions={STATUS_OPTIONS[selectedMediaType] || []}
                sourceOptions={SOURCE_OPTIONS[selectedMediaType] || []}
              />
            </TabsContent>

            {/* 2. Release & Specs */}
            <TabsContent value="release" className="m-0">
              <RrSubmissionReleaseTab
                mediaType={selectedMediaType}
                formData={formData}
                onChange={handleChange}
              />
            </TabsContent>

            {/* 3. Media Assets */}
            <TabsContent value="assets" className="m-0">
              <RrSubmissionAssetsTab
                formData={formData}
                onChange={handleChange}
                onImageUpload={handleImageUpload}
                isUploadingCover={isUploadingCover}
                isUploadingBanner={isUploadingBanner}
                isUploadingBackground={isUploadingBackground}
              />
            </TabsContent>

            {/* 4. Taxonomy & Ratings */}
            <TabsContent value="taxonomy" className="m-0">
              <RrSubmissionTaxonomyTab
                mediaType={selectedMediaType}
                genreOptions={GENRE_OPTIONS[selectedMediaType] || GENRE_OPTIONS.anime}
                selectedGenres={selectedGenres}
                onToggleGenre={handleToggleGenre}
                synonymsList={synonymsList}
                onAddSynonym={handleAddSynonym}
                onRemoveSynonym={handleRemoveSynonym}
                formData={formData}
                onChange={handleChange}
              />
            </TabsContent>

            {/* 5. External IDs */}
            <TabsContent value="external" className="m-0">
              <RrSubmissionExternalIdsTab
                mediaType={selectedMediaType}
                formData={formData}
                onChange={handleChange}
              />
            </TabsContent>

            {/* 6. People & Production */}
            <TabsContent value="people" className="m-0">
              <RrSubmissionPeopleTab
                mediaType={selectedMediaType}
                selectedCharacters={selectedCharacters}
                setSelectedCharacters={setSelectedCharacters}
                selectedStaff={selectedStaff}
                setSelectedStaff={setSelectedStaff}
                selectedStudios={selectedStudios}
                setSelectedStudios={setSelectedStudios}
                selectedRelations={selectedRelations}
                setSelectedRelations={setSelectedRelations}
                onSearchCharacters={handleSearchCharacters}
                onSearchStaff={handleSearchStaff}
                onSearchStudios={handleSearchStudios}
                onSearchRelations={handleSearchRelations}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
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
