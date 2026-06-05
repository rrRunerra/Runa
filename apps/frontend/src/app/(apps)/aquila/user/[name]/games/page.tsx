"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { MediaListDisplay } from "../../../../../../components/aquila/media-list/MediaListDisplay";
import {
  MediaEntry,
  DisplayType,
  MediaFilters,
} from "../../../../../../components/aquila/media-list/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "next-auth/react";
import * as Lucide from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
} as const;

export default function UserGamesPage() {
  const params = useParams();
  const username = params.name as string;
  const { data: session } = useSession();

  if (!username) {
    return <div>User not found</div>;
  }

  const isOwner = session?.user?.username === username;

  const [displayType, setDisplayType] = useState<DisplayType>("grid");
  const [search, setSearch] = useState("");
  const [activeList, setActiveList] = useState("All");
  const [filters, setFilters] = useState<MediaFilters>({
    format: "",
    status: "",
    genres: [],
    country: "",
  });
  const [sort, setSort] = useState<
    "title" | "score" | "progress" | "last_updated" | "last_added"
  >("last_updated");

  const [userData, setUserData] = useState<{
    username: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);

  const [gameList, setGameList] = useState<MediaEntry[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${username}`)
        .then(async (res) => await res.json())
        .then((data) => setUserData(data))
        .catch((err) => console.error("Failed to fetch user data", err));
    }
  }, [username]);

  const fetchGameList = () => {
    if (username) {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/list/game/user/${username}`, {
        headers,
      })
        .then(async (res) => {
          if (res.status === 403) {
            setIsPrivate(true);
            return null;
          }
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch list");
        })
        .then((data) => {
          if (data && data.statusCode !== 404) {
            setGameList(data);
            setIsPrivate(false);
          }
        })
        .catch((err) => console.error("Failed to fetch games list", err));
    }
  };

  useEffect(() => {
    fetchGameList();
  }, [username, session]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila > User > ${userData?.displayName || userData?.username} > Games List`;
  }, [userData]);

  const lists = [
    "All",
    "Playing",
    "Completed",
    "Dropped",
    "Planning",
    "On Hold",
  ];

  const resetFilters = () => {
    setSearch("");
    setActiveList("All");
    setFilters({
      format: "",
      status: "",
      genres: [],
      country: "",
    });
    setSort("last_updated");
  };

  const filteredData = useMemo(() => {
    return gameList.filter((entry) => {
      if (search && !entry.title.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (activeList !== "All") {
        if (!entry.status.toLowerCase().includes(activeList.toLowerCase()))
          return false;
      }

      return true;
    });
  }, [search, activeList, gameList]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const SidebarContents = ({ idPrefix, onItemClick }: { idPrefix: string; onItemClick?: () => void }) => (
    <>
      {/* Search */}
      <div className="relative">
        <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          placeholder="Filter..."
          className="pl-9 h-9 bg-zinc-950/40 border border-zinc-800/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl placeholder:text-muted-foreground/30 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lists navigation */}
      <div className="flex flex-col gap-1 relative">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5 px-3">
          Lists
        </Label>
        {lists.map((list) => {
          const isActive = activeList === list;
          return (
            <button
              key={list}
              onClick={() => {
                setActiveList(list);
                onItemClick?.();
              }}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors text-left cursor-pointer select-none",
                isActive ? "text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`${idPrefix}-activeListHighlight`}
                  className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-md shadow-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{list}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Filters */}
      <div className="flex flex-col gap-5 px-1">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 -mb-3 px-2">
          Filters
        </Label>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground px-2">Sort</Label>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="h-9 bg-zinc-950/40 border border-zinc-800/50 shadow-inner text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl">
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="last_updated">Last Updated</SelectItem>
              <SelectItem value="last_added">Last Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-1 mt-2">
        <button
          onClick={resetFilters}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-zinc-850/50 hover:text-foreground transition-all duration-300 border border-zinc-800/60 cursor-pointer"
        >
          <Lucide.RotateCcw size={14} />
          Reset
        </button>
      </div>
    </>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex flex-col lg:flex-row w-full min-h-screen gap-6 lg:gap-8 p-4 lg:p-6 lg:pl-2 select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Page Sidebar (Left) */}
      <motion.aside
        variants={itemVariants}
        className="hidden lg:flex w-56 flex-col gap-6 shrink-0 sticky top-6 h-fit bg-zinc-950/20 backdrop-blur-xl border border-zinc-800/40 p-5 rounded-2xl shadow-xl z-10"
      >
        <SidebarContents idPrefix="desktop" />
      </motion.aside>

      {/* Main Content (Right) */}
      <motion.main
        variants={itemVariants}
        className="flex-1 flex flex-col gap-6 w-full z-10"
      >
        {/* User Profile Header */}
        {userData && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/20 backdrop-blur-xl border border-zinc-800/40 mb-2 shadow-xl">
            <Avatar
              size="lg"
              className="border-2 border-background ring-2 ring-primary/20"
            >
              <AvatarImage src={userData.avatarUrl} alt={userData.username} />
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {userData.displayName?.[0]?.toUpperCase() ||
                  userData.username?.[0]?.toUpperCase() ||
                  "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {`${userData.displayName || userData.username}'s Games List`}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                @{userData.username}
              </p>
            </div>
          </div>
        )}

        {isPrivate ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl shadow-xl text-center p-6 mt-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Lucide.Lock className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">This list is private</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              The owner of this list has set their privacy preferences to private.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between mt-2">
              <div className="block lg:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 h-9 bg-zinc-950/40 border border-zinc-850 rounded-xl"
                    >
                      <Lucide.SlidersHorizontal size={14} />
                      Filters & Lists
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-6 bg-zinc-950/95 backdrop-blur-md border-r border-zinc-800/40">
                    <SheetHeader className="p-0 mb-4">
                      <SheetTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground text-left">
                        Filters & Lists
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-6 overflow-y-auto pr-1 no-scrollbar">
                      <SidebarContents idPrefix="mobile" onItemClick={() => setIsSheetOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-950/40 p-1 rounded-xl border border-zinc-850 shadow-inner ml-auto">
                {[
                  { type: "list", icon: <Lucide.List size={16} /> },
                  { type: "compact", icon: <Lucide.LayoutList size={16} /> },
                  { type: "grid", icon: <Lucide.LayoutGrid size={16} /> },
                ].map((view) => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={view.type}
                    onClick={() => setDisplayType(view.type as DisplayType)}
                    className={`flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer ${displayType === view.type ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-zinc-800/30 hover:text-foreground"}`}
                  >
                    {view.icon}
                  </motion.button>
                ))}
              </div>
            </header>

            <MediaListDisplay
              lists={activeList === "All" ? ["Playing", "Completed"] : [activeList]}
              data={filteredData}
              displayType={displayType}
              filters={filters}
              sort={sort}
              baseUrl="/aquila/games"
              isOwner={isOwner}
              onRefresh={fetchGameList}
            />
          </>
        )}
      </motion.main>
    </motion.div>
  );
}
