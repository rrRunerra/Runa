import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ChevronsUpDown, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { apps, App } from "../../config/apps";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AppDisplayCard from "./AppDisplayCard";

interface AppSwitcherDropdownProps {
  activeApp: App;
  align?: "start" | "end";
  side?: "bottom" | "right" | "top" | "left";
  sideOffset?: number;
  triggerClassName?: string;
}

export default function AppSwitcherDropdown({
  activeApp,
  align = "start",
  side = "right",
  sideOffset = 12,
  triggerClassName,
}: AppSwitcherDropdownProps) {
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchBookmarks = async () => {
    if (session?.accessToken) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data);
        }
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
      }
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      fetchBookmarks();
    }
  }, [isMenuOpen, session?.accessToken]);

  useEffect(() => {
    const handleChanged = () => {
      if (isMenuOpen) {
        fetchBookmarks();
      }
    };
    window.addEventListener("runa-bookmarks-changed", handleChanged);
    return () => {
      window.removeEventListener("runa-bookmarks-changed", handleChanged);
    };
  }, [isMenuOpen, session?.accessToken]);

  return (
    <DropdownMenu onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 border border-transparent hover:border-zinc-800/40 hover:bg-white/5 data-[state=open]:bg-white/5 data-[state=open]:border-zinc-800/40 cursor-pointer outline-hidden select-none",
            triggerClassName
          )}
        >
          <motion.div
            className="flex items-center w-full"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <AppDisplayCard app={activeApp} />
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0" />
          </motion.div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[400px] rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-3 z-50"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
              Applications
            </span>
            <span className="text-muted-foreground/60 text-[9px] font-medium flex items-center gap-1">
              Press <kbd className="px-1 py-0.5 rounded-sm bg-muted border border-border/50 text-[8px] font-sans font-semibold">Shift</kbd> twice to search
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {apps.map((app, idx) => {
              const isActive = activeApp.name === app.name;
              const hoverBorderClass = app.hoverBorderClass || "hover:border-indigo-500/40 hover:bg-indigo-950/10 hover:shadow-indigo-500/5";
              const logoWrapperClass = app.logoWrapperClass || "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white";

              return (
                <Link href={app.href} key={idx} className="block">
                  <DropdownMenuItem
                    asChild
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-2.5 p-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/10 cursor-pointer text-center transition-all duration-300 hover:shadow-md outline-hidden select-none w-full",
                        hoverBorderClass,
                        isActive && "border-primary/40 bg-primary/5 shadow-md shadow-primary/5"
                      )}
                    >
                      <div className={cn(
                        "flex size-8 items-center justify-center rounded-lg shadow-sm transition-all duration-300 shrink-0",
                        logoWrapperClass,
                        isActive && "scale-105 shadow-md"
                      )}>
                        {app.logo}
                      </div>
                      <span className="font-bold text-[10px] tracking-wide text-foreground group-hover:text-foreground truncate w-full text-center">
                        {app.name}
                      </span>
                    </motion.div>
                  </DropdownMenuItem>
                </Link>
              );
            })}
          </div>

          <DropdownMenuSeparator className="bg-zinc-800/40 my-1" />

          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                Bookmarks
              </span>
            </div>

            {!session ? (
              <div className="text-center py-4 px-2 text-xs text-muted-foreground/50 border border-dashed border-zinc-800/40 rounded-xl bg-zinc-900/5">
                Log in to view and manage bookmarks.
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-4 px-2 text-xs text-muted-foreground/50 border border-dashed border-zinc-800/40 rounded-xl bg-zinc-900/5">
                No bookmarks saved. Use "Add Bookmark" in the profile menu.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                {bookmarks.map((bookmark, idx) => {
                  return (
                    <Link href={bookmark.redirect} key={idx} className="block">
                      <DropdownMenuItem
                        asChild
                      >
                        <motion.div
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className="group flex items-center gap-3 p-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/10 cursor-pointer text-left transition-all duration-300 hover:border-indigo-500/40 hover:bg-indigo-950/10 hover:shadow-indigo-500/5 hover:shadow-sm outline-hidden select-none"
                        >
                          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white shrink-0 transition-all duration-300 relative">
                            {bookmark.icon ? (
                              <>
                                <img
                                  src={bookmark.icon}
                                  alt=""
                                  className="size-4 object-contain rounded-sm"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.bookmark-fallback');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                                <Bookmark className="size-3.5 bookmark-fallback hidden" />
                              </>
                            ) : (
                              <Bookmark className="size-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate group-hover:text-foreground">
                              {bookmark.name}
                            </span>
                            {bookmark.description && (
                              <span className="text-[10px] leading-tight text-muted-foreground truncate group-hover:text-muted-foreground/80">
                                {bookmark.description}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      </DropdownMenuItem>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
