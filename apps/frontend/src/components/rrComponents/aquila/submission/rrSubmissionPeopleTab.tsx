"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, Trash2, Users, UserCheck, Building, GitBranch, Eye, EyeOff } from "lucide-react";

function getNameString(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    return val.english || val.romaji || val.primary || val.namePrimary || val.native || val.name || "";
  }
  return String(val);
}

export interface RrSubmissionPeopleTabProps {
  mediaType: string;
  selectedCharacters: any[];
  setSelectedCharacters: React.Dispatch<React.SetStateAction<any[]>>;
  selectedStaff: any[];
  setSelectedStaff: React.Dispatch<React.SetStateAction<any[]>>;
  selectedStudios: any[];
  setSelectedStudios: React.Dispatch<React.SetStateAction<any[]>>;
  selectedRelations: any[];
  setSelectedRelations: React.Dispatch<React.SetStateAction<any[]>>;
  onSearchCharacters: (query: string) => Promise<any[]>;
  onSearchStaff: (query: string) => Promise<any[]>;
  onSearchStudios: (query: string) => Promise<any[]>;
  onSearchRelations: (query: string) => Promise<any[]>;
}

export function RrSubmissionPeopleTab({
  mediaType,
  selectedCharacters,
  setSelectedCharacters,
  selectedStaff,
  setSelectedStaff,
  selectedStudios,
  setSelectedStudios,
  selectedRelations,
  setSelectedRelations,
  onSearchCharacters,
  onSearchStaff,
  onSearchStudios,
  onSearchRelations,
}: RrSubmissionPeopleTabProps): React.JSX.Element {
  // Search states
  const [charQuery, setCharQuery] = useState("");
  const [charResults, setCharResults] = useState<any[]>([]);
  const [staffQuery, setStaffQuery] = useState("");
  const [staffResults, setStaffResults] = useState<any[]>([]);
  const [studioQuery, setStudioQuery] = useState("");
  const [studioResults, setStudioResults] = useState<any[]>([]);
  const [relationQuery, setRelationQuery] = useState("");
  const [relationResults, setRelationResults] = useState<any[]>([]);

  // Show/Hide section visibility states
  const [showCharacters, setShowCharacters] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showStudios, setShowStudios] = useState(true);
  const [showRelations, setShowRelations] = useState(true);

  // Inline Dialog States
  const [isCharDialogOpen, setIsCharDialogOpen] = useState(false);
  const [newCharData, setNewCharData] = useState({
    namePrimary: "",
    nameNative: "",
    gender: "",
    image: "",
    description: "",
  });

  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    namePrimary: "",
    nameNative: "",
    language: "Japanese",
    image: "",
    description: "",
  });

  const [isStudioDialogOpen, setIsStudioDialogOpen] = useState(false);
  const [newStudioData, setNewStudioData] = useState({
    name: "",
    isAnimationStudio: true,
    siteUrl: "",
  });

  // Search Handlers
  const handleCharSearch = async () => {
    if (!charQuery.trim()) return;
    const res = await onSearchCharacters(charQuery);
    setCharResults(res || []);
  };

  const handleStaffSearch = async () => {
    if (!staffQuery.trim()) return;
    const res = await onSearchStaff(staffQuery);
    setStaffResults(res || []);
  };

  const handleStudioSearch = async () => {
    if (!studioQuery.trim()) return;
    const res = await onSearchStudios(studioQuery);
    setStudioResults(res || []);
  };

  const handleRelationSearch = async () => {
    if (!relationQuery.trim()) return;
    const res = await onSearchRelations(relationQuery);
    setRelationResults(res || []);
  };

  // Inline Creation Handlers
  const handleAddInlineCharacter = () => {
    if (!newCharData.namePrimary.trim()) return;
    setSelectedCharacters((prev) => [
      ...prev,
      {
        isNew: true,
        characterId: null,
        name: newCharData.namePrimary.trim(),
        namePrimary: newCharData.namePrimary.trim(),
        nameNative: newCharData.nameNative.trim() || null,
        gender: newCharData.gender.trim() || null,
        image: newCharData.image.trim() || null,
        description: newCharData.description.trim() || null,
        role: "MAIN",
      },
    ]);
    setNewCharData({
      namePrimary: "",
      nameNative: "",
      gender: "",
      image: "",
      description: "",
    });
    setIsCharDialogOpen(false);
  };

  const handleAddInlineStaff = () => {
    if (!newStaffData.namePrimary.trim()) return;
    setSelectedStaff((prev) => [
      ...prev,
      {
        isNew: true,
        staffId: null,
        name: newStaffData.namePrimary.trim(),
        namePrimary: newStaffData.namePrimary.trim(),
        nameNative: newStaffData.nameNative.trim() || null,
        language: newStaffData.language.trim() || "Japanese",
        image: newStaffData.image.trim() || null,
        description: newStaffData.description.trim() || null,
        role: "DIRECTOR",
      },
    ]);
    setNewStaffData({
      namePrimary: "",
      nameNative: "",
      language: "Japanese",
      image: "",
      description: "",
    });
    setIsStaffDialogOpen(false);
  };

  const handleAddInlineStudio = () => {
    if (!newStudioData.name.trim()) return;
    setSelectedStudios((prev) => [
      ...prev,
      {
        isNew: true,
        studioId: null,
        name: newStudioData.name.trim(),
        isAnimationStudio: newStudioData.isAnimationStudio,
        siteUrl: newStudioData.siteUrl.trim() || null,
        isMain: true,
      },
    ]);
    setNewStudioData({ name: "", isAnimationStudio: true, siteUrl: "" });
    setIsStudioDialogOpen(false);
  };

  return (
    <div className="space-y-6 m-0">
      {/* 1. Characters Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="size-4 text-primary" />
            Characters ({selectedCharacters.length})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowCharacters(!showCharacters)}
              className="gap-1.5 text-xs h-8 font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {showCharacters ? (
                <>
                  <EyeOff className="size-3.5" /> Hide Cards
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Show Cards ({selectedCharacters.length})
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsCharDialogOpen(true)}
              className="gap-1.5 text-xs h-8 font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" />
              Create New Character
            </Button>
          </div>
        </div>

        {showCharacters && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search database characters by name..."
                value={charQuery}
                onChange={(e) => setCharQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleCharSearch())
                }
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCharSearch}
                className="h-10 px-4 rounded-xl font-bold"
              >
                <Search className="size-4" />
              </Button>
            </div>

            {charResults.length > 0 && (
              <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-48 overflow-y-auto space-y-1 shadow-md">
                {charResults.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-xs cursor-pointer gap-2 transition-colors"
                    onClick={() => {
                      if (!selectedCharacters.some((sc) => sc.characterId === c.id)) {
                        setSelectedCharacters((prev) => [
                          ...prev,
                          {
                            characterId: c.id,
                            name: c.namePrimary,
                            image: c.image,
                            role: "MAIN",
                          },
                        ]);
                      }
                      setCharQuery("");
                      setCharResults([]);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.namePrimary}
                          className="size-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          {c.namePrimary?.charAt(0) || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {c.namePrimary}
                        </p>
                        {c.nameNative && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {c.nameNative}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Attach
                    </Badge>
                  </div>
                ))}
              </div>
            )}

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
                        alt={getNameString(char.name || char.namePrimary || "Character")}
                        className="size-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                        {getNameString(char.name || char.namePrimary || "C")?.charAt(0) || "C"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-foreground truncate block">
                        {getNameString(char.name || char.namePrimary || "Character")}
                      </span>
                      {char.isNew && (
                        <Badge variant="secondary" className="text-[9px] font-bold py-0 px-1.5 text-primary bg-primary/10">
                          New Entry
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={char.role || "MAIN"}
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
                        <SelectItem value="SUPPORTING">SUPPORTING</SelectItem>
                        <SelectItem value="BACKGROUND">BACKGROUND</SelectItem>
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
        )}
      </div>

      {/* 2. Staff / Crew Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <UserCheck className="size-4 text-primary" />
            Staff / Crew / Authors ({selectedStaff.length})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowStaff(!showStaff)}
              className="gap-1.5 text-xs h-8 font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {showStaff ? (
                <>
                  <EyeOff className="size-3.5" /> Hide Cards
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Show Cards ({selectedStaff.length})
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsStaffDialogOpen(true)}
              className="gap-1.5 text-xs h-8 font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" />
              Create New Staff Member
            </Button>
          </div>
        </div>

        {showStaff && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search staff/actors by name..."
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleStaffSearch())
                }
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleStaffSearch}
                className="h-10 px-4 rounded-xl font-bold"
              >
                <Search className="size-4" />
              </Button>
            </div>

            {staffResults.length > 0 && (
              <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-48 overflow-y-auto space-y-1 shadow-md">
                {staffResults.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-xs cursor-pointer gap-2 transition-colors"
                    onClick={() => {
                      if (!selectedStaff.some((ss) => ss.staffId === s.id)) {
                        setSelectedStaff((prev) => [
                          ...prev,
                          {
                            staffId: s.id,
                            name: s.namePrimary,
                            image: s.image,
                            role: "DIRECTOR",
                          },
                        ]);
                      }
                      setStaffQuery("");
                      setStaffResults([]);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {s.image ? (
                        <img
                          src={s.image}
                          alt={s.namePrimary}
                          className="size-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                          {s.namePrimary?.charAt(0) || "S"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">
                          {s.namePrimary}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Attach
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {selectedStaff.map((st, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/80 text-xs gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {st.image ? (
                      <img
                        src={st.image}
                        alt={getNameString(st.name || st.namePrimary || "Staff")}
                        className="size-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                        {getNameString(st.name || st.namePrimary || "S")?.charAt(0) || "S"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-foreground truncate block">
                        {getNameString(st.name || st.namePrimary || "Staff")}
                      </span>
                      {st.isNew && (
                        <Badge variant="secondary" className="text-[9px] font-bold py-0 px-1.5 text-primary bg-primary/10">
                          New Entry
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={st.role || "DIRECTOR"}
                      onValueChange={(val) => {
                        const updated = [...selectedStaff];
                        updated[index].role = val;
                        setSelectedStaff(updated);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold w-36 bg-background border-border/70 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIRECTOR">Director</SelectItem>
                        <SelectItem value="ORIGINAL_CREATOR">Original Creator / Author</SelectItem>
                        <SelectItem value="COMPOSER">Music Composer</SelectItem>
                        <SelectItem value="CHARACTER_DESIGN">Character Design</SelectItem>
                        <SelectItem value="ART_DIRECTOR">Art Director</SelectItem>
                        <SelectItem value="SCRIPT">Screenplay / Script</SelectItem>
                        <SelectItem value="PRODUCER">Producer</SelectItem>
                        <SelectItem value="OTHER">Other Role</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() =>
                        setSelectedStaff((prev) =>
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
        )}
      </div>

      {/* 3. Studios / Companies Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Building className="size-4 text-primary" />
            Studios & Production Companies ({selectedStudios.length})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowStudios(!showStudios)}
              className="gap-1.5 text-xs h-8 font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {showStudios ? (
                <>
                  <EyeOff className="size-3.5" /> Hide Cards
                </>
              ) : (
                <>
                  <Eye className="size-3.5" /> Show Cards ({selectedStudios.length})
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsStudioDialogOpen(true)}
              className="gap-1.5 text-xs h-8 font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5" />
              Create New Studio
            </Button>
          </div>
        </div>

        {showStudios && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search studio by name..."
                value={studioQuery}
                onChange={(e) => setStudioQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleStudioSearch())
                }
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleStudioSearch}
                className="h-10 px-4 rounded-xl font-bold"
              >
                <Search className="size-4" />
              </Button>
            </div>

            {studioResults.length > 0 && (
              <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-48 overflow-y-auto space-y-1 shadow-md">
                {studioResults.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-xs cursor-pointer gap-2 transition-colors"
                    onClick={() => {
                      if (!selectedStudios.some((std) => std.studioId === st.id)) {
                        setSelectedStudios((prev) => [
                          ...prev,
                          {
                            studioId: st.id,
                            name: st.name,
                            isMain: true,
                          },
                        ]);
                      }
                      setStudioQuery("");
                      setStudioResults([]);
                    }}
                  >
                    <span className="font-bold text-foreground truncate">
                      {st.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Attach
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {selectedStudios.map((st, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/80 text-xs gap-3 shadow-2xs"
                >
                  <span className="font-bold text-foreground truncate">
                    {getNameString(st.name || "Studio")}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={st.isMain ? "default" : "outline"}
                      onClick={() => {
                        const updated = [...selectedStudios];
                        updated[index].isMain = !updated[index].isMain;
                        setSelectedStudios(updated);
                      }}
                      className="h-8 text-[11px] font-bold rounded-lg px-3"
                    >
                      {st.isMain ? "Main Studio" : "Producer"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() =>
                        setSelectedStudios((prev) =>
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
        )}
      </div>

      {/* 4. Media Relations Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <GitBranch className="size-4 text-primary" />
            Related Media ({selectedRelations.length})
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowRelations(!showRelations)}
            className="gap-1.5 text-xs h-8 font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            {showRelations ? (
              <>
                <EyeOff className="size-3.5" /> Hide Cards
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Show Cards ({selectedRelations.length})
              </>
            )}
          </Button>
        </div>

        {showRelations && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search related media title..."
                value={relationQuery}
                onChange={(e) => setRelationQuery(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), handleRelationSearch())
                }
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleRelationSearch}
                className="h-10 px-4 rounded-xl font-bold"
              >
                <Search className="size-4" />
              </Button>
            </div>

            {relationResults.length > 0 && (
              <div className="p-2 border border-border/60 rounded-xl bg-background/90 max-h-48 overflow-y-auto space-y-1 shadow-md">
                {relationResults.map((rel) => {
                  const title = rel.titlePrimary || rel.titleEnglish || "Media";
                  const img = rel.coverImage;
                  return (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-xs cursor-pointer gap-2 transition-colors"
                      onClick={() => {
                        if (
                          !selectedRelations.some((r) => r.relatedMediaId === rel.id)
                        ) {
                          setSelectedRelations((prev) => [
                            ...prev,
                            {
                              relatedMediaId: rel.id,
                              title,
                              image: img,
                              relationType: "SEQUEL",
                            },
                          ]);
                        }
                        setRelationQuery("");
                        setRelationResults([]);
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {img ? (
                          <img
                            src={img}
                            alt={title}
                            className="w-7 h-10 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-10 rounded-md bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                            M
                          </div>
                        )}
                        <span className="font-bold text-foreground truncate">
                          {title}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        Attach
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

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
                        alt={getNameString(rel.title || "Media")}
                        className="w-7 h-10 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-10 rounded-md bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                        M
                      </div>
                    )}
                    <span className="font-bold text-foreground truncate max-w-44">
                      {getNameString(rel.title || "Media")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={rel.relationType || "SEQUEL"}
                      onValueChange={(val) => {
                        const updated = [...selectedRelations];
                        updated[index].relationType = val;
                        setSelectedRelations(updated);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold w-32 bg-background border-border/70 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEQUEL">SEQUEL</SelectItem>
                        <SelectItem value="PREQUEL">PREQUEL</SelectItem>
                        <SelectItem value="ADAPTATION">ADAPTATION</SelectItem>
                        <SelectItem value="SIDE_STORY">SIDE_STORY</SelectItem>
                        <SelectItem value="SPIN_OFF">SPIN_OFF</SelectItem>
                        <SelectItem value="ALTERNATIVE">ALTERNATIVE</SelectItem>
                        <SelectItem value="PARENT">PARENT</SelectItem>
                        <SelectItem value="SUMMARY">SUMMARY</SelectItem>
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
        )}
      </div>

      {/* --- INLINE CREATION DIALOGS --- */}
      {/* 1. New Character Dialog */}
      <Dialog open={isCharDialogOpen} onOpenChange={setIsCharDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Character</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a brand new character entry to attach to this media submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Primary Name *</Label>
              <Input
                placeholder="e.g. Monkey D. Luffy"
                value={newCharData.namePrimary}
                onChange={(e) =>
                  setNewCharData((prev) => ({ ...prev, namePrimary: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Native Name</Label>
              <Input
                placeholder="e.g. モンキー・D・ルフィ"
                value={newCharData.nameNative}
                onChange={(e) =>
                  setNewCharData((prev) => ({ ...prev, nameNative: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gender</Label>
                <Input
                  placeholder="e.g. Male, Female"
                  value={newCharData.gender}
                  onChange={(e) =>
                    setNewCharData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Image URL</Label>
                <Input
                  placeholder="https://..."
                  value={newCharData.image}
                  onChange={(e) =>
                    setNewCharData((prev) => ({ ...prev, image: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCharDialogOpen(false)}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddInlineCharacter}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Add Character
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. New Staff Dialog */}
      <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Staff Member</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a new staff, actor, or creator entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Primary Name *</Label>
              <Input
                placeholder="e.g. Hayao Miyazaki"
                value={newStaffData.namePrimary}
                onChange={(e) =>
                  setNewStaffData((prev) => ({ ...prev, namePrimary: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Native Name</Label>
              <Input
                placeholder="e.g. 宮崎 駿"
                value={newStaffData.nameNative}
                onChange={(e) =>
                  setNewStaffData((prev) => ({ ...prev, nameNative: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Language</Label>
                <Input
                  placeholder="e.g. Japanese, English"
                  value={newStaffData.language}
                  onChange={(e) =>
                    setNewStaffData((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Image URL</Label>
                <Input
                  placeholder="https://..."
                  value={newStaffData.image}
                  onChange={(e) =>
                    setNewStaffData((prev) => ({ ...prev, image: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStaffDialogOpen(false)}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddInlineStaff}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. New Studio Dialog */}
      <Dialog open={isStudioDialogOpen} onOpenChange={setIsStudioDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-background border border-border p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Studio</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a brand new studio or production company entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Studio Name *</Label>
              <Input
                placeholder="e.g. MAPPA, Kyoto Animation"
                value={newStudioData.name}
                onChange={(e) =>
                  setNewStudioData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Website URL</Label>
              <Input
                placeholder="https://..."
                value={newStudioData.siteUrl}
                onChange={(e) =>
                  setNewStudioData((prev) => ({ ...prev, siteUrl: e.target.value }))
                }
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStudioDialogOpen(false)}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddInlineStudio}
              className="rounded-xl h-9 text-xs font-bold"
            >
              Add Studio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
