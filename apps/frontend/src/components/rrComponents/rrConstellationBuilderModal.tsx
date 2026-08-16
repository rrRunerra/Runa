"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
} from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Sparkles,
  Minus,
  Plus,
  Compass,
  Sliders,
  Bookmark as BookmarkIcon,
  Code2,
  FileJson,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/hooks/useBookmarks";

import {
  StarPoint,
  Bookmark,
  ExportData,
  ConstellationBuilderModalProps,
  RrConstellationToolbar,
  RrConstellationReferenceControls,
  RrConstellationMetadataTab,
  RrConstellationSavedTab,
  RrConstellationExportTab,
  RrConstellationImportTab,
  RrConstellationGuideTab,
  RrConstellationOffsetModal,
} from "./rrConstellationBuilder";

export function RrConstellationBuilderModal({
  open,
  onOpenChange,
  initialRedirect,
  initialName,
  initialIcon,
  mode = "bookmark",
}: ConstellationBuilderModalProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const { t } = useTranslation();

  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<"canvas" | "settings">("canvas");
  const [activeTab, setActiveTab] = useState<string>("metadata");
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );

  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
    }
  }, [open]);

  // Fetch user profile settings if in device mode
  const { data: profileData, mutate: refetchProfile } = useSWR<any>(
    session?.user?.username && session?.accessToken && mode === "device" && open
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/${session.user?.username}`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  // Sync bookmarks using useBookmarks (only if NOT in device mode to save API load)
  const { bookmarks: fetchedBookmarksRaw } = useBookmarks({
    enabled: !!(session?.accessToken && open && mode !== "device"),
  });
  const fetchedBookmarks = fetchedBookmarksRaw as unknown as Bookmark[];

  useEffect(() => {
    if (fetchedBookmarks) {
      setBookmarks(fetchedBookmarks);
    }
  }, [fetchedBookmarks]);

  // Mutation states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ResizeObserver to handle canvas fitting screen
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setCanvasWidth(clientWidth);
        setCanvasHeight(clientHeight);
      }
    };

    if (containerRef.current) {
      updateDimensions();
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  // State variables for stars & connections
  const [stars, setStars] = useState<StarPoint[]>([]);
  const [connections, setConnections] = useState<number[][]>([]);
  const [activeStarIndex, setActiveStarIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Metadata state
  const [name, setName] = useState<string>(initialName || "New Constellation");
  const [description, setDescription] = useState<string>(
    "Custom built constellation.",
  );
  const [redirect, setRedirect] = useState<string>(
    initialRedirect || "/custom-constellation",
  );
  const [icon, setIcon] = useState<string>(initialIcon || "");
  const [connectionColor, setConnectionColor] = useState<string>("");
  const [starColor, setStarColor] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"json" | "javascript">(
    "json",
  );

  // Sky Map Position Offsets
  const [targetRa, setTargetRa] = useState<number>(0);
  const [targetDec, setTargetDec] = useState<number>(0);

  // Image Overlay State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState<number>(0.4);
  const [bgScale, setBgScale] = useState<number>(1);
  const [bgX, setBgX] = useState<number>(0);
  const [bgY, setBgY] = useState<number>(0);
  const [bgRotation, setBgRotation] = useState<number>(0);
  const [bgLocked, setBgLocked] = useState<boolean>(true);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragInitialBgRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // JSON Importer state
  const [importText, setImportText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      if (initialRedirect) setRedirect(initialRedirect);
      if (initialName) setName(initialName);
      if (initialIcon) setIcon(initialIcon);
    }
  }, [open, initialRedirect, initialName, initialIcon]);

  // Load device constellation when profileData is retrieved
  useEffect(() => {
    if (
      open &&
      mode === "device" &&
      profileData &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const constellationStr =
        profileData.profileSettings?.lacerta_drop_constellation;
      if (constellationStr) {
        try {
          const constellation =
            typeof constellationStr === "string"
              ? JSON.parse(constellationStr)
              : constellationStr;
          if (constellation) {
            setName(constellation.name || "My Constellation");
            setStarColor(constellation.starColor || "");
            setConnectionColor(constellation.connectionColor || "");
            if (constellation.stars) {
              const mappedStars = constellation.stars.map((s: any) => ({
                ra: s.ra,
                dec: s.dec,
                x: 0,
                y: 0,
              }));
              setStars(mappedStars);
            }
            if (constellation.connections) {
              setConnections(constellation.connections);
            }
          }
        } catch (e) {
          console.error("Failed to parse device constellation", e);
        }
      }
    }
  }, [open, mode, profileData]);

  // Viewport Settings
  const scale = 30;

  // Calculates LOCAL ra/dec around a 0,0 center
  const screenToRaDec = useCallback(
    (x: number, y: number, currentScale = scale * zoom) => {
      const offsetX = canvasWidth / 2;
      const offsetY = canvasHeight / 2;
      const ra = (x - offsetX) / (15 * currentScale);
      const dec = -(y - offsetY) / currentScale;
      return { ra, dec };
    },
    [zoom, canvasWidth, canvasHeight],
  );

  // Reconstructs screen x/y from local ra/dec
  const raDecToScreen = useCallback(
    (ra: number, dec: number, currentScale = scale * zoom) => {
      const offsetX = canvasWidth / 2;
      const offsetY = canvasHeight / 2;
      const x = ra * 15 * currentScale + offsetX;
      const y = -dec * currentScale + offsetY;
      return { x, y };
    },
    [zoom, canvasWidth, canvasHeight],
  );

  // Finds if a star is within threshold distance of specified coordinates
  const findStarIndexNear = useCallback(
    (x: number, y: number, threshold = 14) => {
      return stars.findIndex((s) => {
        const pos = raDecToScreen(s.ra, s.dec);
        return Math.hypot(pos.x - x, pos.y - y) < threshold;
      });
    },
    [stars, raDecToScreen],
  );

  // Canvas interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!bgLocked) return;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;

    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const clickedStarIndex = findStarIndexNear(x, y);

    if (clickedStarIndex !== -1) {
      if (e.shiftKey) {
        // Toggle connection between active star and clicked star
        if (activeStarIndex !== null && activeStarIndex !== clickedStarIndex) {
          const connectionExists = connections.some(
            (c) =>
              (c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
              (c[0] === clickedStarIndex && c[1] === activeStarIndex),
          );

          if (connectionExists) {
            setConnections(
              connections.filter(
                (c) =>
                  !(
                    (c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
                    (c[0] === clickedStarIndex && c[1] === activeStarIndex)
                  ),
              ),
            );
            toast.info("Connection removed");
          } else {
            setConnections([
              ...connections,
              [activeStarIndex, clickedStarIndex],
            ]);
            toast.success("Connected stars");
          }
        }
      } else {
        // Regular Click: Connect active star to clicked star if not already connected
        if (activeStarIndex !== null && activeStarIndex !== clickedStarIndex) {
          const connectionExists = connections.some(
            (c) =>
              (c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
              (c[0] === clickedStarIndex && c[1] === activeStarIndex),
          );

          if (!connectionExists) {
            setConnections([
              ...connections,
              [activeStarIndex, clickedStarIndex],
            ]);
          }
        }
        // Set clicked star as active
        setActiveStarIndex(clickedStarIndex);
      }
    } else {
      // Clicked empty space: Create a new star
      const { ra, dec } = screenToRaDec(x, y);
      const newStarIndex = stars.length;

      setStars([...stars, { ra, dec, x, y }]);

      if (activeStarIndex !== null) {
        setConnections([...connections, [activeStarIndex, newStarIndex]]);
      }

      setActiveStarIndex(newStarIndex);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    e.preventDefault();
    if (!bgLocked) return;
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;

    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const clickedStarIndex = findStarIndexNear(x, y);
    if (clickedStarIndex !== -1) {
      setActiveStarIndex(clickedStarIndex);
      toast.info(`Selected star [${clickedStarIndex}]`);
    } else {
      setActiveStarIndex(null);
    }
  };

  // Image Overlay dragging logic (mouse & touch)
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (bgLocked || !bgImage) return;
      setIsDraggingImage(true);
      dragStartRef.current = { x: clientX, y: clientY };
      dragInitialBgRef.current = { x: bgX, y: bgY };
    },
    [bgLocked, bgImage, bgX, bgY],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingImage || bgLocked || !bgImage) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      setBgX(Math.round(dragInitialBgRef.current.x + dx / zoom));
      setBgY(Math.round(dragInitialBgRef.current.y + dy / zoom));
    },
    [isDraggingImage, bgLocked, bgImage, zoom],
  );

  const handleDragEnd = useCallback(() => {
    setIsDraggingImage(false);
  }, []);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bgLocked && bgImage) {
      handleDragStart(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  const onMouseMoveWrapper = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingImage) {
      handleDragMove(e.clientX, e.clientY);
    } else {
      handleMouseMove(e);
    }
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!bgLocked && bgImage && e.touches[0]) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingImage && e.touches[0]) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (isDraggingImage) {
      const handleGlobalMouseUp = () => {
        setIsDraggingImage(false);
      };
      window.addEventListener("mouseup", handleGlobalMouseUp);
      window.addEventListener("touchend", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleGlobalMouseUp);
        window.removeEventListener("touchend", handleGlobalMouseUp);
      };
    }
  }, [isDraggingImage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!canvas || !rect) return;
    setHoverPos({
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    });
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  // Nudge reference image by step pixels
  const nudgeImage = (dir: "up" | "down" | "left" | "right", amount = 2) => {
    if (dir === "up") setBgY((prev) => prev - amount);
    if (dir === "down") setBgY((prev) => prev + amount);
    if (dir === "left") setBgX((prev) => prev - amount);
    if (dir === "right") setBgX((prev) => prev + amount);
  };

  const resetImagePosition = () => {
    setBgX(0);
    setBgY(0);
    setBgRotation(0);
    setBgScale(1);
    toast.info("Reference image position reset");
  };

  // Undo last placed star
  const removeLastStar = () => {
    setStars((prevStars) => {
      if (prevStars.length === 0) return prevStars;
      const lastIndex = prevStars.length - 1;

      setConnections((prevConns) =>
        prevConns.filter((c) => c[0] !== lastIndex && c[1] !== lastIndex),
      );

      // Update active star
      setActiveStarIndex((curr) => {
        if (curr === lastIndex) {
          return prevStars.length > 1 ? prevStars.length - 2 : null;
        }
        return curr;
      });

      return prevStars.slice(0, -1);
    });
  };

  // Delete specific active star
  const deleteActiveStar = () => {
    if (activeStarIndex === null) return;
    const indexToDelete = activeStarIndex;

    // Filter connections containing this star
    let newConnections = connections.filter(
      (c) => c[0] !== indexToDelete && c[1] !== indexToDelete,
    );
    // Shift indices of all stars after the deleted one
    newConnections = newConnections.map(([start, end]) => [
      start > indexToDelete ? start - 1 : start,
      end > indexToDelete ? end - 1 : end,
    ]);

    const newStars = stars.filter((_, i) => i !== indexToDelete);
    setStars(newStars);
    setConnections(newConnections);
    setActiveStarIndex(null);
    toast.info(`Deleted star [${indexToDelete}]`);
  };

  // Keyboard Shortcuts: Ctrl+Z (Undo last star), Esc (Deselect active star), Backspace/Delete (Delete active star)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "Escape") {
        setActiveStarIndex(null);
        e.preventDefault();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        removeLastStar();
        e.preventDefault();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (activeStarIndex !== null) {
          deleteActiveStar();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, stars, connections, activeStarIndex]);

  // Attach wheel zoom listener to canvas with non-passive option
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSensitivity = 0.0015;
      const delta = -e.deltaY * zoomSensitivity;
      setZoom((prevZoom) => Math.max(0.5, Math.min(8.0, prevZoom + delta)));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Main drawing engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const currentScale = scale * zoom;
    const raPixelWidth = 15 * currentScale;

    // Find nice RA step (in hours) so lines are at least 50px apart
    const raSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
    let raStep = raSteps[raSteps.length - 1];
    for (const step of raSteps) {
      if (step * raPixelWidth >= 50) {
        raStep = step;
        break;
      }
    }

    // Find nice Dec step (in degrees) so lines are at least 50px apart
    const decSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 45, 90];
    let decStep = decSteps[decSteps.length - 1];
    for (const step of decSteps) {
      if (step * currentScale >= 50) {
        decStep = step;
        break;
      }
    }

    const { ra: minRa, dec: maxDec } = screenToRaDec(0, 0, currentScale);
    const { ra: maxRa, dec: minDec } = screenToRaDec(
      canvasWidth,
      canvasHeight,
      currentScale,
    );

    const startRa = Math.ceil(minRa / raStep) * raStep;
    const endRa = Math.floor(maxRa / raStep) * raStep;

    const startDec = Math.ceil(minDec / decStep) * decStep;
    const endDec = Math.floor(maxDec / decStep) * decStep;

    // Draw Grid Coordinates (Background)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    for (let r = startRa; r <= endRa; r += raStep) {
      if (Math.abs(r) < 0.0001) continue;
      const { x } = raDecToScreen(r, 0, currentScale);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "9px var(--font-mono, monospace)";
      ctx.fillText(`${r.toFixed(2)}h`, x + 3, canvasHeight - 6);
    }

    for (let d = startDec; d <= endDec; d += decStep) {
      if (Math.abs(d) < 0.0001) continue;
      const { y } = raDecToScreen(0, d, currentScale);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "9px var(--font-mono, monospace)";
      ctx.fillText(`${d.toFixed(1)}°`, 6, y - 2);
    }

    const offsetX = canvasWidth / 2;
    const offsetY = canvasHeight / 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvasWidth, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, canvasHeight);
    ctx.stroke();

    // Draw Connections with glowing style
    ctx.strokeStyle = connectionColor || "rgba(99, 102, 241, 0.9)";
    ctx.shadowBlur = 12;
    ctx.shadowColor = connectionColor || "rgba(99, 102, 241, 0.6)";
    ctx.lineWidth = 2.5;

    connections.forEach(([start, end]) => {
      const p1 = stars[start];
      const p2 = stars[end];
      if (!p1 || !p2) return;

      const pos1 = raDecToScreen(p1.ra, p1.dec);
      const pos2 = raDecToScreen(p2.ra, p2.dec);

      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    });

    // Reset shadow for drawing stars
    ctx.shadowBlur = 0;

    // Draw Stars with radial neon glow
    stars.forEach((star, i) => {
      const isActive = i === activeStarIndex;
      const pos = raDecToScreen(star.ra, star.dec);

      // Draw outer glowing halo
      ctx.shadowBlur = isActive ? 16 : 8;
      ctx.shadowColor = isActive
        ? "rgba(245, 158, 11, 0.8)"
        : starColor || "rgba(255, 255, 255, 0.5)";

      // Halo Ring
      ctx.fillStyle = isActive
        ? "rgba(245, 158, 11, 0.25)"
        : "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isActive ? 11 : 8, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner Solid Star
      ctx.fillStyle = isActive ? "#f59e0b" : starColor || "#ffffff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isActive ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label index
      ctx.fillStyle = isActive ? "#fbbf24" : "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 10px var(--font-mono, monospace)";
      ctx.fillText(`[${i}]`, pos.x + 10, pos.y + 4);
    });

    // Draw Hover Cursor HUD
    if (hoverPos) {
      const hoveredStarIndex = findStarIndexNear(hoverPos.x, hoverPos.y);

      if (hoveredStarIndex !== -1) {
        const star = stars[hoveredStarIndex];
        const pos = raDecToScreen(star.ra, star.dec);

        ctx.strokeStyle = "rgba(99, 102, 241, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (activeStarIndex !== null) {
        const activeStar = stars[activeStarIndex];
        if (activeStar) {
          const activePos = raDecToScreen(activeStar.ra, activeStar.dec);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(activePos.x, activePos.y);
          ctx.lineTo(hoverPos.x, hoverPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }, [
    stars,
    connections,
    activeStarIndex,
    hoverPos,
    zoom,
    scale,
    connectionColor,
    starColor,
    screenToRaDec,
    raDecToScreen,
    findStarIndexNear,
    canvasWidth,
    canvasHeight,
  ]);

  // Image Upload handler
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBgImage(event.target?.result as string);
        toast.success("Reference image uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBgImage(null);
    setBgX(0);
    setBgY(0);
    setBgRotation(0);
    setBgScale(1);
    toast.info("Reference image removed");
  };

  // Clear everything
  const clearAll = () => {
    setStars([]);
    setConnections([]);
    setActiveStarIndex(null);
    setEditingBookmarkId(null);
    setConnectionColor("");
    setStarColor("");
    setBgRotation(0);
    setBgLocked(true);
    toast.success("Canvas cleared");
  };

  const formatJSObject = (data: ExportData): string => {
    const indent = "  ";

    const starsStr = data.stars
      .map((s) => {
        return (
          `${indent}${indent}{\n` +
          `${indent}${indent}${indent}ra: ${s.ra.toFixed(2)},\n` +
          `${indent}${indent}${indent}dec: ${s.dec.toFixed(2)},\n` +
          `${indent}${indent}${indent}magnitude: ${s.magnitude.toFixed(1)},\n` +
          `${indent}${indent}${indent}name: "${s.name}",\n` +
          `${indent}${indent}},`
        );
      })
      .join("\n");

    const connsStr = data.connections
      .map((c) => {
        return `${indent}${indent}[${c[0]}, ${c[1]}],`;
      })
      .join("\n");

    let result =
      `{\n` +
      `${indent}name: "${data.name}",\n` +
      `${indent}description: "${data.description}",\n` +
      `${indent}redirect: "${data.redirect}",\n` +
      `${indent}id: "${data.id}",\n`;

    if (data.icon) {
      result += `${indent}icon: "${data.icon}",\n`;
    }
    if (data.connectionColor) {
      result += `${indent}connectionColor: "${data.connectionColor}",\n`;
    }
    if (data.starColor) {
      result += `${indent}starColor: "${data.starColor}",\n`;
    }

    result +=
      `${indent}stars: [\n${starsStr}\n${indent}],\n` +
      `${indent}connections: [\n${connsStr}\n${indent}],\n` +
      `}`;

    return result;
  };

  // Export Data Calculation
  const exportDataStr = (): string => {
    const data: ExportData = {
      name,
      description,
      redirect,
      id: name.toLowerCase().replace(/\s+/g, "-"),
      stars: stars.map((s, i) => ({
        ra: Number((s.ra + targetRa).toFixed(2)),
        dec: Number((s.dec + targetDec).toFixed(2)),
        magnitude: 3.0,
        name: `Star ${i}`,
      })),
      connections,
      ...(icon ? { icon } : {}),
      ...(connectionColor ? { connectionColor } : {}),
      ...(starColor ? { starColor } : {}),
    };

    if (exportFormat === "json") {
      return JSON.stringify(data, null, 2);
    } else {
      return formatJSObject(data);
    }
  };

  // Handle JSON & JS Object Import
  const handleImport = () => {
    const trimmedText = importText.trim();
    if (!trimmedText) {
      toast.error("Please paste JSON or JS Object configuration first");
      return;
    }

    try {
      let parsed: unknown;
      let cleanText = trimmedText;
      if (cleanText.endsWith(",")) {
        cleanText = cleanText.slice(0, -1).trim();
      }
      if (cleanText.endsWith(";")) {
        cleanText = cleanText.slice(0, -1).trim();
      }

      try {
        parsed = JSON.parse(cleanText);
      } catch (e) {
        if (!cleanText.startsWith("{") && !cleanText.startsWith("[")) {
          throw new Error(
            "Input must start with '{' or '[' to be parsed as a JS Object",
          );
        }
        const fn = new Function(`return (${cleanText});`);
        parsed = fn();
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Parsed content is not a valid object or array.");
      }

      const parsedObj = parsed as Record<string, unknown>;

      if (!parsedObj.stars || !Array.isArray(parsedObj.stars)) {
        throw new Error("Missing 'stars' array in configuration.");
      }

      setName(
        typeof parsedObj.name === "string"
          ? parsedObj.name
          : "Imported Constellation",
      );
      setDescription(
        typeof parsedObj.description === "string"
          ? parsedObj.description
          : "Custom built constellation.",
      );
      setRedirect(
        typeof parsedObj.redirect === "string"
          ? parsedObj.redirect
          : "/custom-constellation",
      );
      setIcon(typeof parsedObj.icon === "string" ? parsedObj.icon : "");
      setConnectionColor(
        typeof parsedObj.connectionColor === "string"
          ? parsedObj.connectionColor
          : "",
      );
      setStarColor(
        typeof parsedObj.starColor === "string" ? parsedObj.starColor : "",
      );

      let avgRa = 0;
      let avgDec = 0;
      if (parsedObj.stars.length > 0) {
        let sumRa = 0;
        let sumDec = 0;
        let count = 0;
        parsedObj.stars.forEach((s: unknown) => {
          if (s && typeof s === "object") {
            const star = s as Record<string, unknown>;
            if (typeof star.ra === "number" && typeof star.dec === "number") {
              sumRa += star.ra;
              sumDec += star.dec;
              count++;
            }
          }
        });
        if (count > 0) {
          avgRa = Number((sumRa / count).toFixed(2));
          avgDec = Number((sumDec / count).toFixed(2));
        }
      }

      const impTargetRa =
        typeof parsedObj.targetRa === "number" ? parsedObj.targetRa : avgRa;
      const impTargetDec =
        typeof parsedObj.targetDec === "number" ? parsedObj.targetDec : avgDec;
      setTargetRa(impTargetRa);
      setTargetDec(impTargetDec);

      const starsData = parsedObj.stars;
      const loadedStars = starsData.map((s: unknown) => {
        if (!s || typeof s !== "object") {
          throw new Error("Invalid star element in configuration.");
        }
        const star = s as Record<string, unknown>;
        const starRa = typeof star.ra === "number" ? star.ra : 0;
        const starDec = typeof star.dec === "number" ? star.dec : 0;
        const localRa = starRa - impTargetRa;
        const localDec = starDec - impTargetDec;
        const { x, y } = raDecToScreen(localRa, localDec);
        return { ra: localRa, dec: localDec, x, y };
      });

      setStars(loadedStars);
      setConnections(
        Array.isArray(parsedObj.connections)
          ? (parsedObj.connections as number[][])
          : [],
      );
      setActiveStarIndex(null);
      setImportText("");
      toast.success("Successfully loaded constellation configuration!");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Invalid JSON or JS Object syntax";
      toast.error(`Import Error: ${errorMsg}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportDataStr());
    setCopied(true);
    toast.success("Configuration copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToBookmarks = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to save constellations.");
      return;
    }

    if (stars.length === 0) {
      toast.error("Please place at least one star on the canvas first.");
      return;
    }

    const data = {
      name,
      description,
      redirect,
      stars: stars.map((s, i) => ({
        ra: Number((s.ra + targetRa).toFixed(2)),
        dec: Number((s.dec + targetDec).toFixed(2)),
        magnitude: 3.0,
        name: `Star ${i}`,
      })),
      connections,
      ...(icon ? { icon } : {}),
      connectionColor: connectionColor || undefined,
      starColor: starColor || undefined,
    };

    setIsSaving(true);
    try {
      if (mode === "device") {
        const currentProfileSettings = profileData?.profileSettings || {};
        const updatedSettings = {
          ...currentProfileSettings,
          lacerta_drop_constellation: JSON.stringify(data),
        };

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/settings`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({ profileSettings: updatedSettings }),
          },
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.message || "Failed to save device constellation.",
          );
        }

        toast.success(`Successfully saved your device constellation!`);
        window.dispatchEvent(new CustomEvent("runa-constellation-changed"));
        refetchProfile();
      } else {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/bookmarks`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify(data),
          },
        );
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(
            errJson?.message || t("constellationBuilder.toastFailedSave"),
          );
        }
        const savedBookmark = (await res.json()) as Bookmark;
        toast.success(t("constellationBuilder.toastSaved", { name }));
        window.dispatchEvent(new CustomEvent("runa-bookmarks-changed"));

        setBookmarks((prev) => {
          const index = prev.findIndex((b) => b.name === name);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = savedBookmark;
            return updated;
          }
          return [savedBookmark, ...prev];
        });
      }
    } catch (err: any) {
      toast.error(err.message || t("constellationBuilder.toastFailedSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBookmark = async (
    id: string,
    bookmarkName: string,
  ): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("constellationBuilder.toastLoginRequired"));
      return;
    }

    setDeleteId(id);
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookmarks/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.message || t("constellationBuilder.toastFailedSave"),
        );
      }
      toast.success(
        t("constellationBuilder.toastDeleted", { name: bookmarkName }),
      );
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      window.dispatchEvent(new CustomEvent("runa-bookmarks-changed"));
    } catch (err: any) {
      toast.error(err.message || t("constellationBuilder.toastFailedSave"));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleLoadBookmark = (b: Bookmark) => {
    setName(b.name);
    setDescription(
      b.description || t("constellationBuilder.savedConstellation"),
    );
    setRedirect(b.redirect || "/custom-constellation");
    setIcon(b.icon || "");

    let avgRa = 0;
    let avgDec = 0;
    if (b.stars && Array.isArray(b.stars) && b.stars.length > 0) {
      const sumRa = b.stars.reduce((sum, s) => sum + s.ra, 0);
      const sumDec = b.stars.reduce((sum, s) => sum + s.dec, 0);
      avgRa = Number((sumRa / b.stars.length).toFixed(2));
      avgDec = Number((sumDec / b.stars.length).toFixed(2));
    }

    setTargetRa(avgRa);
    setTargetDec(avgDec);

    const loadedStars = b.stars.map((s) => {
      const localRa = s.ra - avgRa;
      const localDec = s.dec - avgDec;
      const { x, y } = raDecToScreen(localRa, localDec);
      return { ra: localRa, dec: localDec, x, y };
    });

    setStars(loadedStars);
    setConnections(b.connections || []);
    setActiveStarIndex(null);
    setEditingBookmarkId(b.id);
    setConnectionColor(b.connectionColor || "");
    setStarColor(b.starColor || "");
    setActiveTab("metadata");
    toast.success(t("constellationBuilder.toastLoaded", { name: b.name }));
  };

  // Construct user's current constellation dynamically to preview on the starmap
  const currentConstellation = {
    name: name || t("constellationBuilder.savedConstellation"),
    description: description,
    redirect: redirect,
    id: "user-current",
    stars: stars.map((s, i) => ({
      ra: s.ra + targetRa,
      dec: s.dec + targetDec,
      magnitude: 3,
      name: `Star ${i}`,
    })),
    connections: connections,
    icon: icon || undefined,
    connectionColor: connectionColor || undefined,
    starColor: starColor || undefined,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-340 w-[96vw] h-[95vh] max-h-245 p-0 overflow-hidden bg-background border border-border/80 shadow-2xl rounded-2xl flex flex-col font-sans text-foreground">
          {/* Header Section */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between shrink-0 bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hidden sm:block shrink-0 shadow-2xs">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight">
                  {t("constellationBuilder.workspace")}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("constellationBuilder.workspaceDesc")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Workspace Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_395px] overflow-hidden bg-background/50">
            {/* Mobile View Toggle Tabs */}
            <div className="lg:hidden flex border-b border-border/80 bg-muted/30 p-1.5 shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setMobileTab("canvas")}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                  mobileTab === "canvas"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Compass className="size-3.5" />
                {t("constellationBuilder.canvasWorkspace")}
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("settings")}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                  mobileTab === "settings"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sliders className="size-3.5" />
                {t("constellationBuilder.workspaceSettings")}
              </button>
            </div>

            {/* LEFT: Canvas & Viewport Editor */}
            <div
              className={cn(
                "flex-1 flex flex-col p-4 sm:p-5 gap-3.5 overflow-hidden min-w-0 min-h-0 bg-background/60",
                mobileTab !== "canvas" && "hidden lg:flex",
              )}
            >
              {/* Canvas Container Frame */}
              <div
                ref={containerRef}
                className="h-80 sm:h-105 lg:h-auto lg:flex-1 min-h-0 relative border border-border/80 rounded-2xl overflow-hidden shadow-2xl bg-[#020205] select-none w-full group"
              >
                {bgImage && (
                  <Image
                    src={bgImage}
                    alt="Reference overlay"
                    unoptimized
                    fill
                    className="absolute pointer-events-none transform-gpu"
                    style={{
                      opacity: bgOpacity,
                      transform: `translate(${bgX * zoom}px, ${bgY * zoom}px) scale(${bgScale * zoom}) rotate(${bgRotation}deg)`,
                      transformOrigin: "center",
                      left: "50%",
                      top: "50%",
                      marginLeft: "-50%",
                      marginTop: "-50%",
                    }}
                  />
                )}

                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  onClick={handleCanvasClick}
                  onContextMenu={handleContextMenu}
                  onMouseMove={onMouseMoveWrapper}
                  onMouseLeave={handleMouseLeave}
                  onMouseDown={onMouseDown}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  className={cn(
                    "absolute inset-0 w-full h-full z-10",
                    bgLocked
                      ? "cursor-crosshair"
                      : isDraggingImage
                        ? "cursor-grabbing"
                        : "cursor-grab",
                  )}
                  aria-label={t("constellationBuilder.ariaSkyCanvas")}
                />

                {/* HUD Active Node Marker */}
                {activeStarIndex !== null && (
                  <div className="absolute bottom-3.5 left-3.5 z-20 px-2.5 py-1 rounded-lg bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md border border-amber-500/30 text-amber-500 font-mono text-[11px] flex items-center gap-1.5 shadow-md">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                    {t("constellationBuilder.activeNode", {
                      index: activeStarIndex,
                    })}
                  </div>
                )}

                {/* Zoom Controls HUD */}
                <div
                  className="absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1 bg-background/85 dark:bg-zinc-950/85 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setZoom((prev) => Math.max(0.5, prev - 0.25))
                    }
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-90"
                    title={t("constellationBuilder.zoomOut")}
                    aria-label={t("constellationBuilder.zoomOut")}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2 h-7 flex items-center justify-center rounded-lg bg-muted/60 border border-border/60 text-[10px] font-mono font-bold text-foreground hover:bg-muted transition-all min-w-12.5 cursor-pointer"
                    title={t("constellationBuilder.resetZoom")}
                    aria-label={t("constellationBuilder.resetZoom")}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setZoom((prev) => Math.min(8.0, prev + 0.25))
                    }
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-90"
                    title={t("constellationBuilder.zoomIn")}
                    aria-label={t("constellationBuilder.zoomIn")}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick Canvas Controls Toolbar */}
              <RrConstellationToolbar
                starsCount={stars.length}
                connectionsCount={connections.length}
                activeStarIndex={activeStarIndex}
                onUndoLast={removeLastStar}
                onDeleteActive={deleteActiveStar}
                onDeselect={() => setActiveStarIndex(null)}
                onClearWorkspace={clearAll}
              />

              {/* Reference Image Controls Card */}
              <RrConstellationReferenceControls
                bgImage={bgImage}
                bgLocked={bgLocked}
                bgOpacity={bgOpacity}
                bgScale={bgScale}
                bgX={bgX}
                bgY={bgY}
                bgRotation={bgRotation}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
                onToggleLock={() => setBgLocked(!bgLocked)}
                onOpacityChange={setBgOpacity}
                onScaleChange={setBgScale}
                onXChange={setBgX}
                onYChange={setBgY}
                onRotationChange={setBgRotation}
                onNudge={nudgeImage}
                onResetPosition={resetImagePosition}
              />
            </div>

            {/* RIGHT: Properties, Import/Export, and Help Panel */}
            <div
              className={cn(
                "w-full lg:w-98.75 border-t lg:border-t-0 lg:border-l border-border/80 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto shrink-0 bg-muted/15",
                mobileTab !== "settings" && "hidden lg:flex",
              )}
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex flex-col h-full gap-4"
              >
                <TabsList
                  className={cn(
                    "grid w-full bg-muted/60 border border-border/80 p-1 rounded-xl shrink-0 gap-1",
                    mode === "device" ? "grid-cols-4" : "grid-cols-5",
                  )}
                >
                  <TabsTrigger
                    value="metadata"
                    className="text-[10px] sm:text-[11px] font-semibold rounded-lg cursor-pointer flex items-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    <Sliders className="size-3 hidden sm:inline" />
                    {t("constellationBuilder.meta")}
                  </TabsTrigger>
                  {mode !== "device" && (
                    <TabsTrigger
                      value="saved"
                      className="text-[10px] sm:text-[11px] font-semibold rounded-lg cursor-pointer flex items-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                      <BookmarkIcon className="size-3 hidden sm:inline" />
                      {t("constellationBuilder.saved")}
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="export"
                    className="text-[10px] sm:text-[11px] font-semibold rounded-lg cursor-pointer flex items-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    <Code2 className="size-3 hidden sm:inline" />
                    {t("constellationBuilder.export")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="import"
                    className="text-[10px] sm:text-[11px] font-semibold rounded-lg cursor-pointer flex items-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    <FileJson className="size-3 hidden sm:inline" />
                    {t("constellationBuilder.import")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="guide"
                    className="text-[10px] sm:text-[11px] font-semibold rounded-lg cursor-pointer flex items-center gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs"
                  >
                    <HelpCircle className="size-3 hidden sm:inline" />
                    {t("constellationBuilder.guide")}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Metadata */}
                <TabsContent
                  value="metadata"
                  className="mt-0 focus-visible:outline-hidden"
                >
                  <RrConstellationMetadataTab
                    name={name}
                    setName={setName}
                    description={description}
                    setDescription={setDescription}
                    redirect={redirect}
                    setRedirect={setRedirect}
                    icon={icon}
                    setIcon={setIcon}
                    connectionColor={connectionColor}
                    setConnectionColor={setConnectionColor}
                    starColor={starColor}
                    setStarColor={setStarColor}
                    targetRa={targetRa}
                    setTargetRa={setTargetRa}
                    targetDec={targetDec}
                    setTargetDec={setTargetDec}
                    mode={mode}
                    isSaving={isSaving}
                    starsCount={stars.length}
                    editingBookmarkId={editingBookmarkId}
                    onOpenMapPicker={() => setShowMapPicker(true)}
                    onSaveToBookmarks={handleSaveToBookmarks}
                    onCancelEdit={() => {
                      setEditingBookmarkId(null);
                      toast.info(t("constellationBuilder.clearEditSession"));
                    }}
                  />
                </TabsContent>

                {/* Tab 2: Saved Bookmarks */}
                {mode !== "device" && (
                  <TabsContent
                    value="saved"
                    className="mt-0 focus-visible:outline-hidden"
                  >
                    <RrConstellationSavedTab
                      isAuthenticated={!!session?.accessToken}
                      bookmarks={bookmarks}
                      isDeleting={isDeleting}
                      deleteId={deleteId}
                      onLoadBookmark={handleLoadBookmark}
                      onDeleteBookmark={handleDeleteBookmark}
                    />
                  </TabsContent>
                )}

                {/* Tab 3: Export */}
                <TabsContent
                  value="export"
                  className="mt-0 focus-visible:outline-hidden"
                >
                  <RrConstellationExportTab
                    exportFormat={exportFormat}
                    setExportFormat={setExportFormat}
                    exportDataStr={exportDataStr()}
                    copied={copied}
                    onCopy={handleCopy}
                  />
                </TabsContent>

                {/* Tab 4: Import */}
                <TabsContent
                  value="import"
                  className="mt-0 focus-visible:outline-hidden"
                >
                  <RrConstellationImportTab
                    importText={importText}
                    setImportText={setImportText}
                    onImport={handleImport}
                  />
                </TabsContent>

                {/* Tab 5: Guide */}
                <TabsContent
                  value="guide"
                  className="mt-0 focus-visible:outline-hidden"
                >
                  <RrConstellationGuideTab />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer Area */}
          <div className="px-5 sm:px-6 py-3 border-t border-border/80 flex justify-end gap-3 bg-muted/20 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-xl h-9 cursor-pointer transition-colors"
              aria-label="Close builder workspace"
            >
              {t("constellationBuilder.closeWorkspace")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Offset Calibrator Dialog */}
      <RrConstellationOffsetModal
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        targetRa={targetRa}
        setTargetRa={setTargetRa}
        targetDec={targetDec}
        setTargetDec={setTargetDec}
        bookmarks={bookmarks}
        currentConstellation={currentConstellation}
      />
    </>
  );
}
