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
  Undo2,
  Trash2,
  Copy,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshCw,
  Move,
  Compass,
  Plus,
  Minus,
  Pencil,
  HelpCircle as HelpIcon,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { StarMap } from "../stars/StarMap";

interface ConstellationBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRedirect?: string;
  initialName?: string;
  initialIcon?: string;
}

interface StarPoint {
  ra: number;
  dec: number;
  x: number;
  y: number;
}

interface StarBookmarkData {
  ra: number;
  dec: number;
  magnitude: number;
  name: string;
}

interface Bookmark {
  id: string;
  name: string;
  description?: string;
  redirect?: string;
  stars: StarBookmarkData[];
  connections: number[][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

interface ExportData {
  name: string;
  description: string;
  redirect: string;
  id: string;
  stars: StarBookmarkData[];
  connections: number[][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

export function RrConstellationBuilderModal({
  open,
  onOpenChange,
  initialRedirect,
  initialName,
  initialIcon,
}: ConstellationBuilderModalProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();

  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [showRefConstellations, setShowRefConstellations] =
    useState<boolean>(true);
  const [showCustomPreview, setShowCustomPreview] = useState<boolean>(true);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [zoom, setZoom] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<"canvas" | "settings">("canvas");
  const [activeTab, setActiveTab] = useState<string>("metadata");
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );

  // Sync bookmarks using useSWR
  const { data: fetchedBookmarks, mutate: refetchBookmarks } = useSWR<Bookmark[]>(
    session?.accessToken && open
      ? [`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, session.accessToken]
      : null,
    fetcher
  );

  useEffect(() => {
    if (fetchedBookmarks) {
      setBookmarks(fetchedBookmarks);
    }
  }, [fetchedBookmarks]);

  // Refetch bookmarks on change events
  useEffect(() => {
    const handleChanged = () => {
      refetchBookmarks();
    };
    window.addEventListener("runa-bookmarks-changed", handleChanged);
    return () => {
      window.removeEventListener("runa-bookmarks-changed", handleChanged);
    };
  }, [refetchBookmarks]);

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
    (x: number, y: number, threshold = 12) => {
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
      // Prevent scrolling viewport while dragging reference image
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

      // If user is typing in input or textarea, don't trigger canvas shortcuts
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    for (let r = startRa; r <= endRa; r += raStep) {
      if (Math.abs(r) < 0.0001) continue;
      const { x } = raDecToScreen(r, 0, currentScale);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();

      // Draw a small RA label at the bottom of the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.font = "8px var(--font-mono, monospace)";
      ctx.fillText(`${r.toFixed(2)}h`, x + 2, canvasHeight - 6);
    }

    for (let d = startDec; d <= endDec; d += decStep) {
      if (Math.abs(d) < 0.0001) continue;
      const { y } = raDecToScreen(0, d, currentScale);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Draw a small Dec label at the left of the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.font = "8px var(--font-mono, monospace)";
      ctx.fillText(`${d.toFixed(1)}°`, 6, y - 2);
    }

    const offsetX = canvasWidth / 2;
    const offsetY = canvasHeight / 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvasWidth, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, canvasHeight);
    ctx.stroke();

    // Draw Connections with glowing style
    ctx.strokeStyle = "rgba(99, 102, 241, 0.85)"; // Indigo-500
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(99, 102, 241, 0.6)";
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
        : "rgba(255, 255, 255, 0.5)";

      // Halo Ring
      ctx.fillStyle = isActive
        ? "rgba(245, 158, 11, 0.25)"
        : "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isActive ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = "#f59e0b"; // Gold border for active
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner Solid Star
      ctx.fillStyle = isActive ? "#f59e0b" : "#ffffff";
      ctx.shadowBlur = 0; // reset shadow for solid core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isActive ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Label index
      ctx.fillStyle = isActive ? "#fbbf24" : "rgba(255, 255, 255, 0.75)";
      ctx.font = "bold 10px var(--font-mono, monospace)";
      ctx.fillText(`[${i}]`, pos.x + 10, pos.y + 4);
    });

    // Draw Hover Cursor HUD
    if (hoverPos) {
      const hoveredIndex = findStarIndexNear(hoverPos.x, hoverPos.y);

      if (hoveredIndex !== -1) {
        // Highlight hovered star
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const pos = raDecToScreen(
          stars[hoveredIndex].ra,
          stars[hoveredIndex].dec,
        );
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Draw crosshairs at mouse
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 4]);

        ctx.beginPath();
        ctx.moveTo(hoverPos.x, 0);
        ctx.lineTo(hoverPos.x, canvasHeight);
        ctx.moveTo(0, hoverPos.y);
        ctx.lineTo(canvasWidth, hoverPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw preview star
        ctx.fillStyle = "rgba(99, 102, 241, 0.4)";
        ctx.beginPath();
        ctx.arc(hoverPos.x, hoverPos.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw coordinates text near cursor
        const { ra, dec } = screenToRaDec(hoverPos.x, hoverPos.y);
        ctx.fillStyle = "rgba(165, 180, 252, 0.9)"; // Indigo-300
        ctx.font = "9px var(--font-mono, monospace)";
        ctx.fillText(
          `RA: ${ra.toFixed(2)}h  Dec: ${dec.toFixed(2)}°`,
          hoverPos.x + 12,
          hoverPos.y - 8,
        );
      }
    }
  }, [
    stars,
    connections,
    activeStarIndex,
    hoverPos,
    zoom,
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
        // Shift values by sky position offsets
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

      // Clean trailing commas or semicolons commonly copied from file lists/code blocks
      let cleanText = trimmedText;
      if (cleanText.endsWith(",")) {
        cleanText = cleanText.slice(0, -1).trim();
      }
      if (cleanText.endsWith(";")) {
        cleanText = cleanText.slice(0, -1).trim();
      }

      // Try standard JSON.parse first
      try {
        parsed = JSON.parse(cleanText);
      } catch (e) {
        // If it fails, evaluate it as a JS object
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

      // Calculate average RA/Dec to auto-center coordinates if target offsets are not stored in the file
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

      // Reconstruct local coordinates
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

  // Copy JSON logic
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to save constellation bookmark.");
      }
      const savedBookmark = await res.json() as Bookmark;
      toast.success(`Successfully saved "${name}" to database bookmarks!`);
      window.dispatchEvent(new CustomEvent("runa-bookmarks-changed"));

      // Update local bookmarks list
      setBookmarks((prev) => {
        const index = prev.findIndex((b) => b.name === name);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = savedBookmark;
          return updated;
        }
        return [savedBookmark, ...prev];
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save constellation bookmark.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBookmark = async (id: string, bookmarkName: string): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to delete bookmarks.");
      return;
    }

    setDeleteId(id);
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to delete bookmark.");
      }
      toast.success(`Successfully deleted "${bookmarkName}" bookmark.`);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      window.dispatchEvent(new CustomEvent("runa-bookmarks-changed"));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete bookmark.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleLoadBookmark = (b: Bookmark) => {
    setName(b.name);
    setDescription(b.description || "Custom built constellation.");
    setRedirect(b.redirect || "/custom-constellation");
    setIcon(b.icon || "");

    // Calculate average RA/Dec to auto-center coordinates
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
    toast.success(
      `Loaded "${b.name}" constellation into workspace! You can edit its details in the Meta tab.`,
    );
  };

  // Construct user's current constellation dynamically to preview on the starmap
  const currentConstellation = {
    name: name || "New Constellation",
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
        <DialogContent className="sm:max-w-[1320px] w-[95vw] h-[95vh] max-h-[960px] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col font-sans text-foreground">
          {/* Header Section */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hidden sm:block shrink-0">
                <Sparkles className="size-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-wide">
                  Constellation Workspace
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Design custom constellation path networks and generate
                  structured star maps.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Workspace Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_385px] overflow-hidden bg-background/50">
            {/* Mobile View Toggle Tabs */}
            <div className="lg:hidden flex border-b border-border bg-muted/40 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab("canvas")}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                  mobileTab === "canvas"
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
              >
                Canvas Workspace
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("settings")}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                  mobileTab === "settings"
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground border border-transparent",
                )}
              >
                Workspace Settings
              </button>
            </div>

            {/* LEFT: Canvas & Viewport Editor */}
            <div
              className={cn(
                "flex-1 flex flex-col p-4 sm:p-5 gap-4 overflow-hidden min-w-0 min-h-0 bg-background",
                mobileTab !== "canvas" && "hidden lg:flex",
              )}
            >
              {/* Canvas Container Frame (Permanently dark sky map) */}
              <div
                ref={containerRef}
                className="h-[320px] sm:h-[420px] lg:h-auto lg:flex-1 min-h-0 relative border border-border rounded-2xl overflow-hidden shadow-2xl bg-[#020205] select-none w-full"
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
                  aria-label="Constellation designer sky canvas. Click to place stars, connect them, and adjust settings."
                />

                {/* HUD Active Node Marker */}
                {activeStarIndex !== null && (
                  <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-[10px] flex items-center gap-1.5 shadow-sm">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                    Active Node: Star [{activeStarIndex}]
                  </div>
                )}

                {/* Zoom Controls HUD */}
                <div
                  className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md border border-border px-2 py-1.5 rounded-xl shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setZoom((prev) => Math.max(0.5, prev - 0.25))
                    }
                    className="size-7 p-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2 h-7 flex items-center justify-center rounded-lg bg-muted/50 border border-border text-[10px] font-mono font-bold text-foreground hover:bg-muted transition-all min-w-[54px] cursor-pointer"
                    title="Reset Zoom to 100%"
                    aria-label="Reset zoom level to 100 percent"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setZoom((prev) => Math.min(8.0, prev + 0.25))
                    }
                    className="size-7 p-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick Canvas Controls */}
              <div className="flex flex-wrap gap-2.5 items-center justify-between shrink-0">
                <div className="flex gap-2">
                  <Button
                    onClick={removeLastStar}
                    disabled={stars.length === 0}
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    aria-label="Undo last star placement"
                  >
                    <Undo2 className="size-3.5 mr-1" />
                    Undo last (Ctrl+Z)
                  </Button>

                  {activeStarIndex !== null && (
                    <Button
                      onClick={deleteActiveStar}
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10"
                      aria-label="Delete active star"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Delete Active (Del)
                    </Button>
                  )}

                  {activeStarIndex !== null && (
                    <Button
                      onClick={() => setActiveStarIndex(null)}
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-muted-foreground hover:text-foreground"
                      aria-label="Deselect active star"
                    >
                      Deselect (Esc)
                    </Button>
                  )}
                </div>

                <Button
                  onClick={clearAll}
                  disabled={stars.length === 0}
                  variant="destructive"
                  size="sm"
                  className="rounded-lg"
                  aria-label="Clear constellation workspace canvas"
                >
                  <RefreshCw className="size-3.5 mr-1" />
                  Clear Workspace
                </Button>
              </div>

              {/* Reference Image Controls Card */}
              <div className="bg-card border border-border p-4 rounded-xl flex flex-col sm:flex-row gap-5 items-center shrink-0">
                <div className="w-full sm:w-auto flex flex-col gap-1.5 shrink-0">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Upload className="size-3.5" />
                    Overlay Image
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="modal-image-upload"
                      aria-label="Upload reference overlay image"
                    />
                    <label
                      htmlFor="modal-image-upload"
                      className="inline-flex h-9 items-center px-4 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors"
                    >
                      Choose file...
                    </label>
                    {bgImage && (
                      <span className="text-[10px] text-emerald-500 block mt-1 font-mono">
                        Image Loaded
                      </span>
                    )}
                  </div>
                </div>

                {bgImage && (
                  <div className="w-full sm:w-auto flex flex-col gap-1.5 shrink-0">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {bgLocked ? (
                        <Lock className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Unlock className="size-3.5 text-primary" />
                      )}
                      Image Lock
                    </Label>
                    <Button
                      type="button"
                      variant={bgLocked ? "outline" : "default"}
                      size="sm"
                      onClick={() => setBgLocked(!bgLocked)}
                      className={cn(
                        "h-9 px-3 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5",
                        !bgLocked &&
                          "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm",
                      )}
                      aria-label={
                        bgLocked
                          ? "Unlock overlay image position to allow dragging"
                          : "Lock overlay image position"
                      }
                    >
                      {bgLocked ? "Unlock Drag" : "Lock Position"}
                    </Button>
                  </div>
                )}

                {bgImage && (
                  <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Opacity slider */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Opacity</span>
                        <span>{Math.round(bgOpacity * 100)}%</span>
                      </Label>
                      <Slider
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={[bgOpacity]}
                        onValueChange={(val: number[]) => setBgOpacity(val[0])}
                        className="my-1.5"
                        aria-label="Overlay image opacity"
                      />
                    </div>

                    {/* Scale slider */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Scale</span>
                        <span>{bgScale.toFixed(2)}x</span>
                      </Label>
                      <Slider
                        min={0.1}
                        max={4}
                        step={0.05}
                        value={[bgScale]}
                        onValueChange={(val: number[]) => setBgScale(val[0])}
                        className="my-1.5"
                        aria-label="Overlay image scale"
                      />
                    </div>

                    {/* Translate Position Offset Controls */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Pos X</span>
                        <span>{bgX}px</span>
                      </Label>
                      <Slider
                        min={-400}
                        max={400}
                        step={2}
                        value={[bgX]}
                        onValueChange={(val: number[]) => setBgX(val[0])}
                        className="my-1.5"
                        aria-label="Overlay image horizontal offset"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Pos Y</span>
                        <span>{bgY}px</span>
                      </Label>
                      <Slider
                        min={-300}
                        max={300}
                        step={2}
                        value={[bgY]}
                        onValueChange={(val: number[]) => setBgY(val[0])}
                        className="my-1.5"
                        aria-label="Overlay image vertical offset"
                      />
                    </div>

                    {/* Rotation Control */}
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] text-muted-foreground flex justify-between font-mono">
                        <span>Rotation</span>
                        <span>{bgRotation}°</span>
                      </Label>
                      <Slider
                        min={0}
                        max={360}
                        step={1}
                        value={[bgRotation]}
                        onValueChange={(val: number[]) => setBgRotation(val[0])}
                        className="my-1.5"
                        aria-label="Overlay image rotation"
                      />
                    </div>
                  </div>
                )}

                {/* Nudge Buttons Layout */}
                {bgImage && (
                  <div className="flex flex-col gap-1 bg-muted/40 p-2 rounded-lg border border-border shrink-0">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest text-center block mb-1 font-mono">
                      Nudge
                    </span>
                    <div className="grid grid-cols-3 gap-1 w-20">
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeImage("up")}
                        className="size-5 bg-card border border-border rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-colors cursor-pointer"
                        title="Nudge Image Up"
                        aria-label="Nudge Image Up"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeImage("left")}
                        className="size-5 bg-card border border-border rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-colors cursor-pointer"
                        title="Nudge Image Left"
                        aria-label="Nudge Image Left"
                      >
                        <ArrowLeft className="size-3" />
                      </button>
                      <div className="size-5 flex items-center justify-center text-[8px] text-muted-foreground/60">
                        <Move className="size-2" />
                      </div>
                      <button
                        type="button"
                        onClick={() => nudgeImage("right")}
                        className="size-5 bg-card border border-border rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-colors cursor-pointer"
                        title="Nudge Image Right"
                        aria-label="Nudge Image Right"
                      >
                        <ArrowRight className="size-3" />
                      </button>
                      <div />
                      <button
                        type="button"
                        onClick={() => nudgeImage("down")}
                        className="size-5 bg-card border border-border rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95 transition-colors cursor-pointer"
                        title="Nudge Image Down"
                        aria-label="Nudge Image Down"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                      <div />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Properties, Import/Export, and Help Panel */}
            <div
              className={cn(
                "w-full lg:w-[385px] border-t lg:border-t-0 lg:border-l border-border p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto shrink-0 bg-muted/20",
                mobileTab !== "settings" && "hidden lg:flex",
              )}
            >
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full flex flex-col h-full gap-4"
              >
                <TabsList className="grid grid-cols-5 w-full bg-muted border border-border p-[3px] rounded-xl shrink-0">
                  <TabsTrigger
                    value="metadata"
                    className="text-[10px] sm:text-[11px] cursor-pointer"
                  >
                    Meta
                  </TabsTrigger>
                  <TabsTrigger
                    value="saved"
                    className="text-[10px] sm:text-[11px] cursor-pointer"
                  >
                    Saved
                  </TabsTrigger>
                  <TabsTrigger
                    value="export"
                    className="text-[10px] sm:text-[11px] cursor-pointer"
                  >
                    Export
                  </TabsTrigger>
                  <TabsTrigger
                    value="import"
                    className="text-[10px] sm:text-[11px] cursor-pointer"
                  >
                    Import
                  </TabsTrigger>
                  <TabsTrigger
                    value="guide"
                    className="text-[10px] sm:text-[11px] cursor-pointer"
                  >
                    Guide
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Metadata */}
                <TabsContent
                  value="metadata"
                  className="mt-0 focus-visible:outline-hidden flex flex-col gap-4"
                >
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3.5">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest border-b border-border pb-2">
                      Constellation Meta
                    </h3>

                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="const-name">Name</FieldLabel>
                        <Input
                          id="const-name"
                          type="text"
                          value={name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setName(e.target.value)
                          }
                          className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="const-desc">
                          Description
                        </FieldLabel>
                        <Input
                          id="const-desc"
                          type="text"
                          value={description}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setDescription(e.target.value)
                          }
                          className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="const-redirect">
                          Redirect Path
                        </FieldLabel>
                        <Input
                          id="const-redirect"
                          type="text"
                          value={redirect}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setRedirect(e.target.value)
                          }
                          className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="const-icon">
                          Icon URL (Optional)
                        </FieldLabel>
                        <Input
                          id="const-icon"
                          type="text"
                          placeholder="e.g. /favicons/my-app.ico"
                          value={icon}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setIcon(e.target.value)
                          }
                          className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20"
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel htmlFor="const-conn-color">
                            Line Color
                          </FieldLabel>
                          <div className="flex gap-1.5 items-center">
                            <Input
                              id="const-conn-color"
                              type="text"
                              placeholder="e.g. #8b5cf6"
                              value={connectionColor}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setConnectionColor(e.target.value)
                              }
                              className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 font-mono w-full"
                            />
                            <input
                              type="color"
                              value={connectionColor || "#ffffff"}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setConnectionColor(e.target.value)
                              }
                              className="size-6 rounded-md border border-input bg-transparent cursor-pointer shrink-0 p-0 overflow-hidden"
                              title="Choose line color"
                              aria-label="Choose line connection color visually"
                            />
                          </div>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="const-star-color">
                            Star Color
                          </FieldLabel>
                          <div className="flex gap-1.5 items-center">
                            <Input
                              id="const-star-color"
                              type="text"
                              placeholder="e.g. #f59e0b"
                              value={starColor}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setStarColor(e.target.value)
                              }
                              className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 font-mono w-full"
                            />
                            <input
                              type="color"
                              value={starColor || "#ffffff"}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setStarColor(e.target.value)
                              }
                              className="size-6 rounded-md border border-input bg-transparent cursor-pointer shrink-0 p-0 overflow-hidden"
                              title="Choose star color"
                              aria-label="Choose star color visually"
                            />
                          </div>
                        </Field>
                      </div>
                    </FieldGroup>

                    {/* Offset Positions */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-border mt-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Universe Target Position Offset
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Shifts coordinates so lines load at these coordinate
                        values in StarMap.
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor="offset-ra"
                            className="text-[10px] text-muted-foreground font-mono"
                          >
                            RA Offset (Hours)
                          </Label>
                          <Input
                            id="offset-ra"
                            type="number"
                            step="0.01"
                            value={targetRa}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setTargetRa(parseFloat(e.target.value) || 0)
                            }
                            className="h-8 text-xs bg-background border-input font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor="offset-dec"
                            className="text-[10px] text-muted-foreground font-mono"
                          >
                            Dec Offset (Deg)
                          </Label>
                          <Input
                            id="offset-dec"
                            type="number"
                            step="0.01"
                            value={targetDec}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setTargetDec(parseFloat(e.target.value) || 0)
                            }
                            className="h-8 text-xs bg-background border-input font-mono"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => setShowMapPicker(true)}
                        type="button"
                        variant="outline"
                        className="w-full mt-3 h-8 text-[11px] text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center gap-1.5"
                        aria-label="Pick target offset visually from the StarMap"
                      >
                        <Compass className="size-3.5" />
                        Pick Offset visually from StarMap
                      </Button>

                      <Button
                        onClick={handleSaveToBookmarks}
                        type="button"
                        disabled={stars.length === 0 || isSaving}
                        className="w-full mt-2 h-8 text-[11px] bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={
                          isSaving
                            ? "Saving constellation..."
                            : editingBookmarkId
                              ? "Update existing bookmark"
                              : "Add current constellation to database bookmarks"
                        }
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="size-3.5 animate-spin" />
                            Saving Constellation...
                          </>
                        ) : editingBookmarkId ? (
                          <>
                            <Check className="size-3.5" />
                            Update Bookmark
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" />
                            Add to Bookmarks
                          </>
                        )}
                      </Button>

                      {editingBookmarkId && (
                        <Button
                          onClick={() => {
                            setEditingBookmarkId(null);
                            toast.info(
                              "Cleared edit session. Creating new bookmark now.",
                            );
                          }}
                          type="button"
                          variant="ghost"
                          className="w-full mt-1.5 h-8 text-[11px] text-muted-foreground hover:text-foreground"
                          aria-label="Cancel editing this bookmark, shift to creating a new bookmark instead"
                        >
                          Cancel Edit (Create New)
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Saved Bookmarks */}
                <TabsContent
                  value="saved"
                  className="mt-0 focus-visible:outline-hidden flex flex-col gap-4"
                >
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                        Saved Constellations
                      </h3>
                    </div>

                    {!session?.accessToken ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Please sign in to manage database bookmarks.
                      </p>
                    ) : bookmarks.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No bookmarks saved in database yet.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
                        {bookmarks.map((b) => (
                          <div
                            key={b.id}
                            className="bg-background border border-border hover:border-muted-foreground/35 p-3 rounded-lg flex items-center justify-between gap-3 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-foreground truncate">
                                {b.name}
                              </h4>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {b.description || "No description provided."}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  {Array.isArray(b.stars) ? b.stars.length : 0}{" "}
                                  stars
                                </span>
                                <span className="text-[9px] font-mono text-muted-foreground">
                                  {Array.isArray(b.connections)
                                    ? b.connections.length
                                    : 0}{" "}
                                  connections
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                onClick={() => handleLoadBookmark(b)}
                                size="xs"
                                variant="outline"
                                className="h-7 px-2 rounded-md text-[10px] border-border text-primary hover:bg-muted cursor-pointer flex items-center gap-1"
                                title={`Edit constellation ${b.name}`}
                                aria-label={`Edit constellation ${b.name}`}
                              >
                                <Pencil className="size-3" />
                                Edit
                              </Button>
                              <Button
                                onClick={() =>
                                  handleDeleteBookmark(b.id, b.name)
                                }
                                size="xs"
                                variant="outline"
                                disabled={isDeleting && deleteId === b.id}
                                className="h-7 px-2 rounded-md text-[10px] border-destructive/20 text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
                                title={`Delete constellation ${b.name}`}
                                aria-label={`Delete constellation ${b.name}`}
                              >
                                {isDeleting && deleteId === b.id ? (
                                  <RefreshCw className="size-3 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Export */}
                <TabsContent
                  value="export"
                  className="mt-0 focus-visible:outline-hidden flex flex-col h-[480px]"
                >
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5 h-full">
                    <div className="flex items-center justify-between border-b border-border pb-2 shrink-0">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                        Export Configuration
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 bg-muted p-[2px] rounded-lg border border-border">
                          <button
                            onClick={() => setExportFormat("json")}
                            className={cn(
                              "px-2 py-0.5 text-[9px] font-medium rounded transition-all cursor-pointer",
                              exportFormat === "json"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            aria-label="Format export as JSON"
                          >
                            JSON
                          </button>
                          <button
                            onClick={() => setExportFormat("javascript")}
                            className={cn(
                              "px-2 py-0.5 text-[9px] font-medium rounded transition-all cursor-pointer",
                              exportFormat === "javascript"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            aria-label="Format export as JavaScript Object"
                          >
                            JS Object
                          </button>
                        </div>
                        <Button
                          onClick={handleCopy}
                          size="xs"
                          variant="secondary"
                          className="h-6 gap-1 rounded bg-muted hover:bg-muted/80 border-0"
                          aria-label="Copy configuration text to clipboard"
                        >
                          {copied ? (
                            <>
                              <Check className="size-3 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="relative flex-1 overflow-hidden rounded-lg border border-border bg-muted/30 p-3 h-full">
                      <textarea
                        readOnly
                        value={exportDataStr()}
                        className="w-full h-full bg-transparent font-mono text-[10px] text-primary resize-none outline-hidden overflow-y-auto pr-2"
                        aria-label="Serialized constellation export text"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: Import */}
                <TabsContent
                  value="import"
                  className="mt-0 focus-visible:outline-hidden flex flex-col gap-4"
                >
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-widest">
                        Import Configuration
                      </h3>
                      <Button
                        onClick={handleImport}
                        size="xs"
                        className="h-6 bg-primary hover:bg-primary/95 text-primary-foreground rounded cursor-pointer"
                        aria-label="Trigger import from text workspace"
                      >
                        Import
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 h-96">
                      <textarea
                        placeholder="Paste JSON or JS Object config code here to load it onto the canvas..."
                        value={importText}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          setImportText(e.target.value)
                        }
                        className="w-full h-full bg-transparent font-mono text-[10px] text-foreground placeholder-muted-foreground/60 resize-none outline-hidden overflow-y-auto"
                        aria-label="Input field for pasting constellation configurations to import"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 5: Guide */}
                <TabsContent
                  value="guide"
                  className="mt-0 focus-visible:outline-hidden flex flex-col gap-4"
                >
                  <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold mb-1 border-b border-border pb-2">
                      <HelpIcon className="size-3.5 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-widest">
                        Workspace Guide
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-muted-foreground text-[11px] list-disc list-inside">
                      <li>
                        <strong className="text-foreground">
                          Click empty canvas:
                        </strong>{" "}
                        Add star & auto-connect to current active star.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Click existing star:
                        </strong>{" "}
                        Connect active star to it, and select it as new active
                        node.
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Shift+Click existing star:
                        </strong>{" "}
                        Toggle connection from active star (without changing
                        active star).
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Deselect active star:
                        </strong>{" "}
                        Press{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">
                          Esc
                        </kbd>
                        .
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Delete active star:
                        </strong>{" "}
                        Press{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">
                          Backspace
                        </kbd>{" "}
                        /{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">
                          Del
                        </kbd>
                        .
                      </li>
                      <li>
                        <strong className="text-foreground">
                          Undo last star:
                        </strong>{" "}
                        Press{" "}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] border border-border">
                          Ctrl + Z
                        </kbd>
                        .
                      </li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Footer Area */}
          <div className="px-5 sm:px-6 py-3 border-t border-border flex justify-end gap-3 bg-muted/10 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-xl h-9 cursor-pointer"
              aria-label="Close builder workspace"
            >
              Close Workspace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Offset Calibrator Dialog */}
      <Dialog open={showMapPicker} onOpenChange={setShowMapPicker}>
        <DialogContent className="sm:max-w-[1040px] w-[95vw] h-[90vh] max-h-[820px] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl flex flex-col font-sans text-foreground z-60">
          <DialogHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold tracking-wide">
                Select Sky Target Offset
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Click anywhere on the StarMap to set the target center
                coordinates. Drag to pan, scroll to zoom.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 relative w-full h-full bg-[#020205] overflow-hidden">
            <StarMap
              width={1000}
              height={580}
              numOfStars={15000}
              constellations={[
                ...(showRefConstellations ? REFERENCE_CONSTELLATIONS : []),
                ...(showBookmarks
                  ? bookmarks.map((b) => ({
                      name: b.name,
                      description: b.description || "",
                      redirect: b.redirect || "",
                      id: b.id,
                      stars: b.stars.map((s) => ({
                        ra: s.ra,
                        dec: s.dec,
                        magnitude: s.magnitude,
                        name: s.name,
                      })),
                      connections: b.connections,
                      icon: b.icon || undefined,
                    }))
                  : []),
                ...(showCustomPreview ? [currentConstellation] : []),
              ]}
              onMapClick={(ra, dec) => {
                setTargetRa(Number(ra.toFixed(2)));
                setTargetDec(Number(dec.toFixed(2)));
                toast.success(
                  `Offset calibrated to RA: ${ra.toFixed(2)}h, Dec: ${dec.toFixed(2)}°`,
                );
              }}
            >
              {/* Target Offset Beacon/Marker in World Space */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                style={{
                  left: targetRa * 15 * 30,
                  top: -targetDec * 30,
                }}
              >
                <div className="relative flex items-center justify-center">
                  {/* Glowing rings */}
                  <span className="absolute size-10 rounded-full border border-primary/40 bg-primary/5 animate-ping opacity-75" />
                  <span className="absolute size-6 rounded-full border border-primary/60 bg-primary/15 animate-pulse" />
                  <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px_#818cf8]" />

                  {/* Crosshair lines */}
                  <div className="absolute w-14 h-px bg-primary/30" />
                  <div className="absolute h-14 w-px bg-primary/30" />

                  {/* Text Label */}
                  <div className="absolute top-5 left-5 bg-background border border-border px-2 py-0.5 rounded-md text-[9px] font-mono text-foreground shadow-md whitespace-nowrap flex items-center gap-1">
                    <span className="size-1 rounded-full bg-primary animate-pulse" />
                    Center Point
                  </div>
                </div>
              </div>
            </StarMap>

            {/* Floating HUD info panel */}
            <div className="absolute top-4 left-4 z-30 p-3.5 rounded-xl bg-background/85 dark:bg-zinc-950/85 backdrop-blur-md border border-border shadow-xl flex flex-col gap-1.5 max-w-[280px]">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold font-mono">
                Offset Calibration
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">RA Offset:</span>
                  <span className="text-primary font-bold">
                    {targetRa.toFixed(2)}h
                  </span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Dec Offset:</span>
                  <span className="text-primary font-bold">
                    {targetDec.toFixed(2)}°
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={showCustomPreview}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setShowCustomPreview(e.target.checked)
                    }
                    className="rounded border-input bg-background text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Custom Preview
                </label>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={showBookmarks}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setShowBookmarks(e.target.checked)
                    }
                    className="rounded border-input bg-background text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Saved Bookmarks
                </label>
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={showRefConstellations}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setShowRefConstellations(e.target.checked)
                    }
                    className="rounded border-input bg-background text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Reference Constellations
                </label>
              </div>

              <p className="text-[10px] text-muted-foreground leading-normal border-t border-border pt-2 mt-1 font-sans">
                Click to position the center of the constellation. Your custom
                constellation is highlighted in real-time.
              </p>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-3 border-t border-border flex justify-end gap-3 bg-muted/10 shrink-0">
            <Button
              onClick={() => setShowMapPicker(false)}
              className="text-xs sm:text-sm font-semibold h-9 px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-xs cursor-pointer"
              aria-label="Finish calibrating map offset coordinates"
            >
              Done Calibrating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
