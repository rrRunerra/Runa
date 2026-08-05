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
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Sparkles, Info, Calendar, ImageIcon, Tag, Database, Users, Lock, Unlock, Calculator, Book } from "lucide-react";

import { RrSubmissionBasicTab } from "../submission/rrSubmissionBasicTab";
import { RrSubmissionReleaseTab } from "../submission/rrSubmissionReleaseTab";
import { RrSubmissionAssetsTab } from "../submission/rrSubmissionAssetsTab";
import { RrSubmissionTaxonomyTab } from "../submission/rrSubmissionTaxonomyTab";
import { RrSubmissionExternalIdsTab } from "../submission/rrSubmissionExternalIdsTab";
import { RrSubmissionPeopleTab } from "../submission/rrSubmissionPeopleTab";
import { RrSubmissionInternalMetricsTab } from "../submission/rrSubmissionInternalMetricsTab";

export interface RrBookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType?: "CREATE" | "EDIT";
  mediaId?: number;
  initialData?: Record<string, any>;
  onSuccess?: () => void;
}

const GENRES = [
  "Art", "Biography", "Business", "Children", "Comics", "Cooking",
  "Fiction", "Graphic Novels", "Health", "History", "Horror", "Memoir",
  "Mystery", "Non-Fiction", "Poetry", "Psychology", "Religion", "Romance",
  "Science", "Sci-Fi", "Self-Help", "Travel", "Young Adult",
];

const FORMATS = ["Hardcover", "Paperback", "eBook", "Audiobook"];
const STATUSES = ["PUBLISHED", "RELEASING", "CANCELLED", "ON_HIATUS", "UNKNOWN"];
const SOURCES = ["Original", "Folklore", "Historical Events"];

export function RrBookEditModal({
  isOpen,
  onClose,
  actionType = "EDIT",
  mediaId,
  initialData = {},
  onSuccess,
}: RrBookEditModalProps): React.JSX.Element {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [isLocked, setIsLocked] = useState<boolean>(initialData?.locked ?? false);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [synonymsList, setSynonymsList] = useState<string[]>([]);

  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any[]>([]);
  const [selectedStudios, setSelectedStudios] = useState<any[]>([]);
  const [selectedRelations, setSelectedRelations] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsLocked(initialData?.locked ?? false);
      setFormData({
        titlePrimary: initialData?.titlePrimary || initialData?.titleEnglish || initialData?.title?.english || "",
        titleEnglish: initialData?.titleEnglish || initialData?.titlePrimary || initialData?.title?.english || "",
        titleSecondary: initialData?.titleSecondary || initialData?.titleRomaji || initialData?.title?.romaji || "",
        titleRomaji: initialData?.titleRomaji || initialData?.titleSecondary || initialData?.title?.romaji || "",
        titleNative: initialData?.titleNative || initialData?.title?.native || "",
        subtitle: initialData?.subtitle || "",
        tagline: initialData?.tagline || "",
        description: initialData?.description || "",
        coverImage: initialData?.coverImageLarge || initialData?.coverImage || "",
        bannerImage: initialData?.bannerImage || "",
        format: initialData?.format || "Paperback",
        status: initialData?.status || "PUBLISHED",
        source: initialData?.source || "Original",
        series: initialData?.series || "",
        seriesPosition: initialData?.seriesPosition || "",
        pageCount: initialData?.pageCount || initialData?.pages || "",
        chapterCount: initialData?.chapterCount || "",
        volumeCount: initialData?.volumeCount || "",
        authors: Array.isArray(initialData?.authors) ? initialData.authors.join(", ") : initialData?.authors || "",
        publishers: Array.isArray(initialData?.publishers) ? initialData.publishers.join(", ") : initialData?.publishers || "",
        isbn10: initialData?.isbn10 || "",
        isbn13: initialData?.isbn13 || "",
        retailPrice: initialData?.retailPrice || "",
        retailPriceCurrency: initialData?.retailPriceCurrency || "USD",
        previewLink: initialData?.previewLink || "",
        infoLink: initialData?.infoLink || "",
        buyLink: initialData?.buyLink || "",
        startDateYear: initialData?.startDateYear || initialData?.releaseDateYear || "",
        startDateMonth: initialData?.startDateMonth || initialData?.releaseDateMonth || "",
        startDateDay: initialData?.startDateDay || initialData?.releaseDateDay || "",
        isAdult: typeof initialData?.isAdult === "boolean" ? initialData.isAdult : false,
        countryOfOrigin: initialData?.countryOfOrigin || "US",
        originalLanguage: initialData?.originalLanguage || "en",
        ageRating: initialData?.ageRating || "",
        ageRatingGuide: initialData?.ageRatingGuide || "",
        website: initialData?.website || "",
        siteUrl: initialData?.siteUrl || "",
        googleBookId: initialData?.googleBookId || "",
      });

      setSelectedGenres(Array.isArray(initialData?.genres) ? initialData.genres : Array.isArray(initialData?.subjects) ? initialData.subjects : []);
      setSynonymsList(Array.isArray(initialData?.synonyms) ? initialData.synonyms : []);

      if (Array.isArray(initialData?.characters)) {
        setSelectedCharacters(
          initialData.characters.map((c: any) => ({
            ...c,
            characterId: c.characterId || c.id || c.character?.id,
            name:
              typeof c.name === "object" && c.name !== null
                ? c.name.english || c.name.romaji || c.name.primary || c.name.native || "Character"
                : c.name || c.namePrimary || c.character?.namePrimary || "Character",
            image: c.image || c.coverImage || c.character?.image,
            role: c.role || "MAIN",
          }))
        );
      }
      if (Array.isArray(initialData?.staff)) {
        setSelectedStaff(
          initialData.staff.map((s: any) => ({
            ...s,
            staffId: s.staffId || s.id || s.actorId || s.staff?.id,
            name:
              typeof s.name === "object" && s.name !== null
                ? s.name.english || s.name.romaji || s.name.primary || s.name.native || "Staff"
                : s.name || s.namePrimary || s.staff?.namePrimary || "Staff",
            image: s.image || s.staff?.image,
            role: s.role || "DIRECTOR",
          }))
        );
      }
      if (Array.isArray(initialData?.studiosList) || Array.isArray(initialData?.studiosData)) {
        const rawStudios = initialData.studiosList || initialData.studiosData;
        setSelectedStudios(
          rawStudios.map((st: any) => ({
            ...st,
            studioId: st.studioId || st.id || st.studio?.id,
            name:
              typeof st.name === "object" && st.name !== null
                ? st.name.primary || st.name.english || "Studio"
                : st.name || st.studio?.name || "Studio",
            isMain: typeof st.isMain === "boolean" ? st.isMain : true,
          }))
        );
      }
      if (Array.isArray(initialData?.relations)) {
        setSelectedRelations(
          initialData.relations.map((r: any) => ({
            ...r,
            relatedMediaId: r.relatedMediaId || r.id,
            title:
              typeof r.title === "object" && r.title !== null
                ? r.title.english || r.title.romaji || r.title.primary || r.title.native || "Related Media"
                : r.title || r.titlePrimary || r.titleEnglish || "Related Media",
            image: r.image || r.coverImage,
            relationType: r.relationType || "SEQUEL",
          }))
        );
      }
    }
  }, [isOpen, mediaId, initialData]);

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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "coverImage" | "bannerImage" | "backgroundImage",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "coverImage") setIsUploadingCover(true);
    else setIsUploadingBanner(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        body: uploadData,
      });

      if (!res.ok) throw new Error("Failed to upload image");
      const json = await res.json();
      handleChange(field, json.url);
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      if (field === "coverImage") setIsUploadingCover(false);
      else setIsUploadingBanner(false);
    }
  };

  const handleSubmit = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to submit media edits.");
      return;
    }

    setIsSubmitting(true);
    const payloadData = {
      ...formData,
      locked: isLocked,
      genres: selectedGenres,
      subjects: selectedGenres,
      synonyms: synonymsList,
      authors: typeof formData.authors === "string" ? formData.authors.split(",").map((s: string) => s.trim()).filter(Boolean) : formData.authors,
      publishers: typeof formData.publishers === "string" ? formData.publishers.split(",").map((s: string) => s.trim()).filter(Boolean) : formData.publishers,
      characters: selectedCharacters,
      staff: selectedStaff,
      studiosList: selectedStudios,
      relations: selectedRelations,
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          mediaType: "book",
          actionType,
          mediaId: mediaId ? Number(mediaId) : undefined,
          data: payloadData,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Failed to submit book data");
      }

      toast.success("Book submission sent for administrator review!");
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
        <DialogHeader className="p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Book className="size-5 text-primary" />
                {actionType === "EDIT" ? "Edit Book Metadata" : "Add New Book Entry"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Edit book series, page count, ISBN-10/13, authors, publishers, pricing, and lock state.
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant={isLocked ? "destructive" : "outline"}
              onClick={() => setIsLocked(!isLocked)}
              className="h-10 px-4 rounded-xl text-xs font-bold gap-2 shadow-2xs transition-all"
            >
              {isLocked ? (
                <>
                  <Lock className="size-4 text-destructive-foreground" /> Entry Locked
                </>
              ) : (
                <>
                  <Unlock className="size-4 text-emerald-500" /> Entry Unlocked
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 pb-3 border-b border-border/50 bg-muted/15">
            <TabsList className="flex items-center justify-start gap-1 h-11 bg-muted/60 p-1 rounded-xl w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scrollbar-none border border-border/50 shadow-2xs">
              <TabsTrigger value="basic" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <Info className="size-3.5" /> Basic Info
              </TabsTrigger>
              <TabsTrigger value="release" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <Calendar className="size-3.5" /> Series, Pages & Pricing
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <ImageIcon className="size-3.5" /> Assets
              </TabsTrigger>
              <TabsTrigger value="taxonomy" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <Tag className="size-3.5" /> Taxonomy & Ratings
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <Users className="size-3.5" /> Characters, Authors & Publishers
              </TabsTrigger>
              <TabsTrigger value="external" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary whitespace-nowrap">
                <Database className="size-3.5" /> External & ISBN IDs
              </TabsTrigger>
              <TabsTrigger value="metrics" className="gap-1.5 px-3 text-xs rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-amber-500 whitespace-nowrap">
                <Calculator className="size-3.5 text-amber-500" /> System Metrics
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="basic">
              <RrSubmissionBasicTab
                mediaType="book"
                formData={formData}
                onChange={handleChange}
                formatOptions={FORMATS}
                statusOptions={STATUSES}
                sourceOptions={SOURCES}
              />
            </TabsContent>

            <TabsContent value="release">
              <RrSubmissionReleaseTab mediaType="book" formData={formData} onChange={handleChange} />
            </TabsContent>

            <TabsContent value="assets">
              <RrSubmissionAssetsTab
                formData={formData}
                onChange={handleChange}
                onImageUpload={handleImageUpload}
                isUploadingCover={isUploadingCover}
                isUploadingBanner={isUploadingBanner}
                isUploadingBackground={false}
              />
            </TabsContent>

            <TabsContent value="taxonomy">
              <RrSubmissionTaxonomyTab
                mediaType="book"
                genreOptions={GENRES}
                selectedGenres={selectedGenres}
                onToggleGenre={handleToggleGenre}
                synonymsList={synonymsList}
                onAddSynonym={handleAddSynonym}
                onRemoveSynonym={handleRemoveSynonym}
                formData={formData}
                onChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="people">
              <RrSubmissionPeopleTab
                mediaType="book"
                selectedCharacters={selectedCharacters}
                setSelectedCharacters={setSelectedCharacters}
                selectedStaff={selectedStaff}
                setSelectedStaff={setSelectedStaff}
                selectedStudios={selectedStudios}
                setSelectedStudios={setSelectedStudios}
                selectedRelations={selectedRelations}
                setSelectedRelations={setSelectedRelations}
                onSearchCharacters={async (q) => {
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/characters?q=${encodeURIComponent(q)}`);
                    if (res.ok) return await res.json();
                  } catch {}
                  return [];
                }}
                onSearchStaff={async (q) => {
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/actors?q=${encodeURIComponent(q)}`);
                    if (res.ok) return await res.json();
                  } catch {}
                  return [];
                }}
                onSearchStudios={async (q) => {
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/studios?q=${encodeURIComponent(q)}`);
                    if (res.ok) return await res.json();
                  } catch {}
                  return [];
                }}
                onSearchRelations={async (q) => {
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/search/relations?mediaType=book&q=${encodeURIComponent(q)}`);
                    if (res.ok) return await res.json();
                  } catch {}
                  return [];
                }}
              />
            </TabsContent>

            <TabsContent value="external">
              <RrSubmissionExternalIdsTab mediaType="book" formData={formData} onChange={handleChange} />
            </TabsContent>

            <TabsContent value="metrics">
              <RrSubmissionInternalMetricsTab mediaType="book" initialData={initialData} />
            </TabsContent>
          </div>

          <DialogFooter className="p-4 border-t border-border/50 bg-muted/20 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="h-10 px-6 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmitting ? "Submitting..." : "Submit Book Edits"}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
