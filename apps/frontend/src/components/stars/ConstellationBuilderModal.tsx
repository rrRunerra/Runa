"use client";

import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Sparkles, Undo2, Trash2, Copy, Upload, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, HelpCircle, X, Check, RefreshCw, Move, 
  HelpCircle as HelpIcon, Compass, Plus, Minus
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StarMap } from "./StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { useSession } from "next-auth/react";

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

export function ConstellationBuilderModal({
  open,
  onOpenChange,
  initialRedirect,
  initialName,
  initialIcon,
}: ConstellationBuilderModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: session } = useSession();
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showRefConstellations, setShowRefConstellations] = useState(true);
  const [showCustomPreview, setShowCustomPreview] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState<"canvas" | "settings">("canvas");

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (session?.accessToken && open) {
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
          console.error("Error fetching bookmarks in builder:", err);
        }
      }
    };
    fetchBookmarks();
  }, [session, open]);
  
  // State variables for stars & connections
  const [stars, setStars] = useState<StarPoint[]>([]);
  const [connections, setConnections] = useState<number[][]>([]);
  const [activeStarIndex, setActiveStarIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  
  // Metadata state
  const [name, setName] = useState<string>(initialName || "New Constellation");
  const [description, setDescription] = useState<string>("Custom built constellation.");
  const [redirect, setRedirect] = useState<string>(initialRedirect || "/custom-constellation");

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      if (initialRedirect) setRedirect(initialRedirect);
      if (initialName) setName(initialName);
      if (initialIcon) setIcon(initialIcon);
    }
  }, [open, initialRedirect, initialName, initialIcon]);
  const [icon, setIcon] = useState<string>(initialIcon || "");
  const [exportFormat, setExportFormat] = useState<"json" | "javascript">("json");
  
  // Sky Map Position Offsets
  const [targetRa, setTargetRa] = useState<number>(0);
  const [targetDec, setTargetDec] = useState<number>(0);

  // Image Overlay State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState<number>(0.4);
  const [bgScale, setBgScale] = useState<number>(1);
  const [bgX, setBgX] = useState<number>(0);
  const [bgY, setBgY] = useState<number>(0);

  // JSON Importer state
  const [importText, setImportText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Viewport Settings
  const width = 800;
  const height = 600;
  const scale = 30;
  const offsetX = width / 2;
  const offsetY = height / 2;

  // Calculates LOCAL ra/dec around a 0,0 center
  const screenToRaDec = useCallback((x: number, y: number, currentScale = scale * zoom) => {
    const ra = (x - offsetX) / (15 * currentScale);
    const dec = -(y - offsetY) / currentScale;
    return { ra, dec };
  }, [zoom]);

  // Reconstructs screen x/y from local ra/dec
  const raDecToScreen = useCallback((ra: number, dec: number, currentScale = scale * zoom) => {
    const x = ra * 15 * currentScale + offsetX;
    const y = -dec * currentScale + offsetY;
    return { x, y };
  }, [zoom]);

  // Finds if a star is within threshold distance of specified coordinates
  const findStarIndexNear = useCallback((x: number, y: number, threshold = 12) => {
    return stars.findIndex((s) => {
      const pos = raDecToScreen(s.ra, s.dec);
      return Math.hypot(pos.x - x, pos.y - y) < threshold;
    });
  }, [stars, raDecToScreen]);

  // Canvas interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedStarIndex = findStarIndexNear(x, y);

    if (clickedStarIndex !== -1) {
      if (e.shiftKey) {
        // Toggle connection between active star and clicked star
        if (activeStarIndex !== null && activeStarIndex !== clickedStarIndex) {
          const connectionExists = connections.some(
            (c) =>
              (c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
              (c[0] === clickedStarIndex && c[1] === activeStarIndex)
          );

          if (connectionExists) {
            setConnections(
              connections.filter(
                (c) =>
                  !((c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
                    (c[0] === clickedStarIndex && c[1] === activeStarIndex))
              )
            );
            toast.info("Connection removed");
          } else {
            setConnections([...connections, [activeStarIndex, clickedStarIndex]]);
            toast.success("Connected stars");
          }
        }
      } else {
        // Regular Click: Connect active star to clicked star if not already connected
        if (activeStarIndex !== null && activeStarIndex !== clickedStarIndex) {
          const connectionExists = connections.some(
            (c) =>
              (c[0] === activeStarIndex && c[1] === clickedStarIndex) ||
              (c[0] === clickedStarIndex && c[1] === activeStarIndex)
          );

          if (!connectionExists) {
            setConnections([...connections, [activeStarIndex, clickedStarIndex]]);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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

    ctx.clearRect(0, 0, width, height);

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
    const { ra: maxRa, dec: minDec } = screenToRaDec(width, height, currentScale);

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
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw a small RA label at the bottom of the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.font = "8px var(--font-mono, monospace)";
      ctx.fillText(`${r.toFixed(2)}h`, x + 2, height - 6);
    }

    for (let d = startDec; d <= endDec; d += decStep) {
      if (Math.abs(d) < 0.0001) continue;
      const { y } = raDecToScreen(0, d, currentScale);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Draw a small Dec label at the left of the canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.font = "8px var(--font-mono, monospace)";
      ctx.fillText(`${d.toFixed(1)}°`, 6, y - 2);
    }

    // Draw Main Center Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
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
      ctx.shadowColor = isActive ? "rgba(245, 158, 11, 0.8)" : "rgba(255, 255, 255, 0.5)";
      
      // Halo Ring
      ctx.fillStyle = isActive ? "rgba(245, 158, 11, 0.25)" : "rgba(255, 255, 255, 0.15)";
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
        const pos = raDecToScreen(stars[hoveredIndex].ra, stars[hoveredIndex].dec);
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Draw crosshairs at mouse
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 4]);
        
        ctx.beginPath();
        ctx.moveTo(hoverPos.x, 0);
        ctx.lineTo(hoverPos.x, height);
        ctx.moveTo(0, hoverPos.y);
        ctx.lineTo(width, hoverPos.y);
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
          hoverPos.y - 8
        );
      }
    }
  }, [stars, connections, activeStarIndex, hoverPos, zoom, raDecToScreen, findStarIndexNear]);

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

  // Undo last placed star
  const removeLastStar = () => {
    setStars((prevStars) => {
      if (prevStars.length === 0) return prevStars;
      const lastIndex = prevStars.length - 1;
      
      setConnections((prevConns) => 
        prevConns.filter((c) => c[0] !== lastIndex && c[1] !== lastIndex)
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
      (c) => c[0] !== indexToDelete && c[1] !== indexToDelete
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

  // Clear everything
  const clearAll = () => {
    setStars([]);
    setConnections([]);
    setActiveStarIndex(null);
    toast.success("Canvas cleared");
  };

  const formatJSObject = (data: any) => {
    const indent = "  ";
    
    const starsStr = data.stars.map((s: any, i: number) => {
      return `${indent}${indent}{\n` +
             `${indent}${indent}${indent}ra: ${s.ra.toFixed(2)},\n` +
             `${indent}${indent}${indent}dec: ${s.dec.toFixed(2)},\n` +
             `${indent}${indent}${indent}magnitude: ${s.magnitude.toFixed(1)},\n` +
             `${indent}${indent}${indent}name: "${s.name}",\n` +
             `${indent}${indent}},`;
    }).join("\n");

    const connsStr = data.connections.map((c: any) => {
      return `${indent}${indent}[${c[0]}, ${c[1]}],`;
    }).join("\n");

    let result = `{\n` +
                 `${indent}name: "${data.name}",\n` +
                 `${indent}description: "${data.description}",\n` +
                 `${indent}redirect: "${data.redirect}",\n` +
                 `${indent}id: "${data.id}",\n`;
                 
    if (data.icon) {
      result += `${indent}icon: "${data.icon}",\n`;
    }

    result +=    `${indent}stars: [\n${starsStr}\n${indent}],\n` +
                 `${indent}connections: [\n${connsStr}\n${indent}],\n` +
                 `}`;
                 
    return result;
  };

  // Export Data Calculation
  const exportDataStr = () => {
    const data = {
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
      let parsed: any;
      
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
          throw new Error("Input must start with '{' or '[' to be parsed as a JS Object");
        }
        const fn = new Function(`return (${cleanText});`);
        parsed = fn();
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Parsed content is not a valid object or array.");
      }

      if (!parsed.stars || !Array.isArray(parsed.stars)) {
        throw new Error("Missing 'stars' array in configuration.");
      }

      setName(parsed.name || "Imported Constellation");
      setDescription(parsed.description || "Custom built constellation.");
      setRedirect(parsed.redirect || "/custom-constellation");
      setIcon(parsed.icon || "");

      // Calculate average RA/Dec to auto-center coordinates if target offsets are not stored in the file
      let avgRa = 0;
      let avgDec = 0;
      if (parsed.stars.length > 0) {
        const sumRa = parsed.stars.reduce((sum: number, s: any) => sum + s.ra, 0);
        const sumDec = parsed.stars.reduce((sum: number, s: any) => sum + s.dec, 0);
        avgRa = Number((sumRa / parsed.stars.length).toFixed(2));
        avgDec = Number((sumDec / parsed.stars.length).toFixed(2));
      }

      const impTargetRa = typeof parsed.targetRa === "number" ? parsed.targetRa : avgRa;
      const impTargetDec = typeof parsed.targetDec === "number" ? parsed.targetDec : avgDec;
      setTargetRa(impTargetRa);
      setTargetDec(impTargetDec);

      // Reconstruct local coordinates
      const loadedStars = parsed.stars.map((s: any, i: number) => {
        const localRa = s.ra - impTargetRa;
        const localDec = s.dec - impTargetDec;
        const { x, y } = raDecToScreen(localRa, localDec);
        return { ra: localRa, dec: localDec, x, y };
      });

      setStars(loadedStars);
      setConnections(parsed.connections || []);
      setActiveStarIndex(null);
      setImportText("");
      toast.success("Successfully loaded constellation configuration!");
    } catch (err: any) {
      toast.error(`Import Error: ${err.message || "Invalid JSON or JS Object syntax"}`);
    }
  };

  // Copy JSON logic
  const handleCopy = () => {
    navigator.clipboard.writeText(exportDataStr());
    setCopied(true);
    toast.success("Configuration copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToBookmarks = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to save constellations.");
      return;
    }

    if (stars.length === 0) {
      toast.error("Please place at least one star on the canvas first.");
      return;
    }

    try {
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
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save constellation.");
      }

      const result = await res.json();
      toast.success(`Successfully saved "${name}" to database bookmarks!`);
      
      // Update local bookmarks list
      setBookmarks((prev) => {
        const index = prev.findIndex((b) => b.name === name);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = result;
          return updated;
        }
        return [result, ...prev];
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save constellation bookmark.");
    }
  };

  const handleDeleteBookmark = async (id: string, name: string) => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to delete bookmarks.");
      return;
    }
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete bookmark.");
      }

      toast.success(`Successfully deleted "${name}" bookmark.`);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete bookmark.");
    }
  };

  const handleLoadBookmark = (b: any) => {
    setName(b.name);
    setDescription(b.description || "Custom built constellation.");
    setRedirect(b.redirect || "/custom-constellation");
    setIcon(b.icon || "");

    // Calculate average RA/Dec to auto-center coordinates
    let avgRa = 0;
    let avgDec = 0;
    if (b.stars && Array.isArray(b.stars) && b.stars.length > 0) {
      const sumRa = b.stars.reduce((sum: number, s: any) => sum + s.ra, 0);
      const sumDec = b.stars.reduce((sum: number, s: any) => sum + s.dec, 0);
      avgRa = Number((sumRa / b.stars.length).toFixed(2));
      avgDec = Number((sumDec / b.stars.length).toFixed(2));
    }

    setTargetRa(avgRa);
    setTargetDec(avgDec);

    const loadedStars = b.stars.map((s: any) => {
      const localRa = s.ra - avgRa;
      const localDec = s.dec - avgDec;
      const { x, y } = raDecToScreen(localRa, localDec);
      return { ra: localRa, dec: localDec, x, y };
    });

    setStars(loadedStars);
    setConnections(b.connections || []);
    setActiveStarIndex(null);
    toast.success(`Loaded "${b.name}" constellation into workspace!`);
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
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1320px] w-[95vw] h-[95vh] md:h-[900px] p-0 overflow-hidden bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl flex flex-col font-sans text-white">
        
        {/* Header Section */}
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:block shrink-0">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-wide">
                Constellation Builder Workspace
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Design custom constellation path networks and generate structured star maps.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-zinc-900/10">
          
          {/* Mobile View Toggle Tabs */}
          <div className="lg:hidden flex border-b border-zinc-800/40 bg-zinc-950/40 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("canvas")}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer",
                mobileTab === "canvas" 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
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
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm" 
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              )}
            >
              Workspace Settings
            </button>
          </div>

          {/* LEFT: Canvas & Viewport Editor */}
          <div className={cn("flex-1 flex flex-col p-4 sm:p-5 gap-4 overflow-y-auto min-w-0", mobileTab !== "canvas" && "hidden lg:flex")}>
            
            {/* Mobile Swipe Helper Note */}
            <div className="lg:hidden flex items-center justify-center gap-1 text-[10px] text-zinc-500 font-medium font-mono tracking-wide">
              Swipe canvas horizontally to view the whole workspace
            </div>

            {/* Scrollable Canvas Container for Mobile/Touch viewports */}
            <div className="w-full overflow-x-auto pb-2 flex justify-start lg:justify-center touch-pan-x scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {/* Canvas Frame */}
              <div className="relative border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl bg-[#020205] select-none shrink-0" style={{ width, height }}>
              {bgImage && (
                <img
                  src={bgImage}
                  alt="Reference overlay"
                  className="absolute pointer-events-none transform-gpu"
                  style={{
                    opacity: bgOpacity,
                    transform: `translate(${bgX * zoom}px, ${bgY * zoom}px) scale(${bgScale * zoom})`,
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
                width={width}
                height={height}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="absolute inset-0 cursor-crosshair z-10"
              />

              {/* HUD Active Node Marker */}
              {activeStarIndex !== null && (
                <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] flex items-center gap-1.5 shadow-sm">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                  Active Node: Star [{activeStarIndex}]
                </div>
              )}

              {/* Zoom Controls HUD */}
              <div 
                className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 px-2 py-1.5 rounded-xl shadow-lg"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="size-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
                  title="Zoom Out"
                >
                  <Minus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-2 h-7 flex items-center justify-center rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-[10px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all min-w-[54px] cursor-pointer"
                  title="Reset Zoom to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(8.0, prev + 0.25))}
                  className="size-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
                  title="Zoom In"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

            {/* Quick Canvas Controls */}
            <div className="flex flex-wrap gap-2.5 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={removeLastStar}
                  disabled={stars.length === 0}
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                >
                  <Undo2 className="size-3.5 mr-1" />
                  Undo last (Ctrl+Z)
                </Button>
                
                {activeStarIndex !== null && (
                  <Button
                    onClick={deleteActiveStar}
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-red-500/20 text-red-400 hover:bg-red-500/10"
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
                    className="rounded-lg text-zinc-400 hover:text-zinc-200"
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
              >
                <RefreshCw className="size-3.5 mr-1" />
                Clear Workspace
              </Button>
            </div>

            {/* Reference Image Controls Card */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl flex flex-col sm:flex-row gap-5 items-center">
              <div className="w-full sm:w-auto flex flex-col gap-1.5 shrink-0">
                <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
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
                  />
                  <label
                    htmlFor="modal-image-upload"
                    className="inline-flex h-9 items-center px-4 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-800/40 text-xs font-medium text-zinc-300 cursor-pointer transition-colors"
                  >
                    Choose file...
                  </label>
                  {bgImage && (
                    <span className="text-[10px] text-emerald-400 block mt-1 font-mono">
                      Image Loaded
                    </span>
                  )}
                </div>
              </div>

              {bgImage && (
                <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Opacity slider */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 flex justify-between font-mono">
                      <span>Opacity</span>
                      <span>{Math.round(bgOpacity * 100)}%</span>
                    </Label>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 my-1.5"
                    />
                  </div>

                  {/* Scale slider */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 flex justify-between font-mono">
                      <span>Scale</span>
                      <span>{bgScale.toFixed(2)}x</span>
                    </Label>
                    <input
                      type="range"
                      min="0.1"
                      max="4"
                      step="0.05"
                      value={bgScale}
                      onChange={(e) => setBgScale(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 my-1.5"
                    />
                  </div>

                  {/* Translate Position Offset Controls */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 flex justify-between font-mono">
                      <span>Pos X</span>
                      <span>{bgX}px</span>
                    </Label>
                    <input
                      type="range"
                      min="-400"
                      max="400"
                      step="2"
                      value={bgX}
                      onChange={(e) => setBgX(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 my-1.5"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-zinc-400 flex justify-between font-mono">
                      <span>Pos Y</span>
                      <span>{bgY}px</span>
                    </Label>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      step="2"
                      value={bgY}
                      onChange={(e) => setBgY(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 my-1.5"
                    />
                  </div>
                </div>
              )}

              {/* Nudge Buttons Layout */}
              {bgImage && (
                <div className="flex flex-col gap-1 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40 shrink-0">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest text-center block mb-1 font-mono">
                    Nudge
                  </span>
                  <div className="grid grid-cols-3 gap-1 w-20">
                    <div />
                    <button
                      onClick={() => nudgeImage("up")}
                      className="size-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <div />
                    <button
                      onClick={() => nudgeImage("left")}
                      className="size-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
                    >
                      <ArrowLeft className="size-3" />
                    </button>
                    <div className="size-5 flex items-center justify-center text-[8px] text-zinc-600">
                      <Move className="size-2" />
                    </div>
                    <button
                      onClick={() => nudgeImage("right")}
                      className="size-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
                    >
                      <ArrowRight className="size-3" />
                    </button>
                    <div />
                    <button
                      onClick={() => nudgeImage("down")}
                      className="size-5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-95"
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
          <div className={cn("w-full lg:w-[385px] border-t lg:border-t-0 lg:border-l border-zinc-800/40 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto shrink-0 bg-zinc-950/20", mobileTab !== "settings" && "hidden lg:flex")}>
            
            <Tabs defaultValue="metadata" className="w-full flex flex-col h-full gap-4">
              <TabsList className="grid grid-cols-5 w-full bg-zinc-950/50 border border-zinc-800/60 p-[3px] rounded-xl shrink-0">
                <TabsTrigger value="metadata" className="text-[10px] sm:text-[11px]">
                  Meta
                </TabsTrigger>
                <TabsTrigger value="saved" className="text-[10px] sm:text-[11px]">
                  Saved
                </TabsTrigger>
                <TabsTrigger value="export" className="text-[10px] sm:text-[11px]">
                  Export
                </TabsTrigger>
                <TabsTrigger value="import" className="text-[10px] sm:text-[11px]">
                  Import
                </TabsTrigger>
                <TabsTrigger value="guide" className="text-[10px] sm:text-[11px]">
                  Guide
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Metadata */}
              <TabsContent value="metadata" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-3.5">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest border-b border-zinc-800/40 pb-2">
                    Constellation Meta
                  </h3>
                  
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="const-name" className="text-xs text-zinc-400">
                      Name
                    </Label>
                    <Input
                      id="const-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50 border-zinc-800 focus-visible:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="const-desc" className="text-xs text-zinc-400">
                      Description
                    </Label>
                    <Input
                      id="const-desc"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50 border-zinc-800 focus-visible:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="const-redirect" className="text-xs text-zinc-400">
                      Redirect Path
                    </Label>
                    <Input
                      id="const-redirect"
                      type="text"
                      value={redirect}
                      onChange={(e) => setRedirect(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50 border-zinc-800 focus-visible:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="const-icon" className="text-xs text-zinc-400">
                      Icon (Optional)
                    </Label>
                    <Input
                      id="const-icon"
                      type="text"
                      placeholder="e.g. StarIcon"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="h-8 text-xs bg-zinc-950/50 border-zinc-800 focus-visible:ring-indigo-500/20"
                    />
                  </div>

                  {/* Offset Positions */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-zinc-400">
                      Universe Target Position Offset
                    </Label>
                    <p className="text-[10px] text-zinc-500">
                      Shifts final coordinates so constellation lines load at these coordinates in StarMap.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="offset-ra" className="text-[10px] text-zinc-500 font-mono">
                          RA Offset (Hours)
                        </Label>
                        <Input
                          id="offset-ra"
                          type="number"
                          step="0.01"
                          value={targetRa}
                          onChange={(e) => setTargetRa(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs bg-zinc-950/50 border-zinc-800 font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="offset-dec" className="text-[10px] text-zinc-500 font-mono">
                          Dec Offset (Deg)
                        </Label>
                        <Input
                          id="offset-dec"
                          type="number"
                          step="0.01"
                          value={targetDec}
                          onChange={(e) => setTargetDec(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs bg-zinc-950/50 border-zinc-800 font-mono"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setShowMapPicker(true)}
                      type="button"
                      variant="outline"
                      className="w-full mt-2 h-8 text-[11px] border-zinc-800 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900/60 flex items-center justify-center gap-1.5"
                    >
                      <Compass className="size-3.5" />
                      Pick Offset visually from StarMap
                    </Button>

                    <Button
                      onClick={handleSaveToBookmarks}
                      type="button"
                      disabled={stars.length === 0}
                      className="w-full mt-2 h-8 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="size-3.5" />
                      Add to Bookmarks
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 1.5: Saved Bookmarks */}
              <TabsContent value="saved" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
                      Saved Constellations
                    </h3>
                  </div>
                  
                  {!session?.accessToken ? (
                    <p className="text-xs text-zinc-500 text-center py-8 font-sans">
                      Please sign in to manage database bookmarks.
                    </p>
                  ) : bookmarks.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-8 font-sans">
                      No bookmarks saved in database yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
                      {bookmarks.map((b) => (
                        <div 
                          key={b.id} 
                          className="bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 p-3 rounded-lg flex items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">
                              {b.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              {b.description || "No description provided."}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[9px] font-mono text-zinc-500">
                                {Array.isArray(b.stars) ? b.stars.length : 0} stars
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500">
                                {Array.isArray(b.connections) ? b.connections.length : 0} connections
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              onClick={() => handleLoadBookmark(b)}
                              size="xs"
                              variant="outline"
                              className="h-7 px-2 rounded-md text-[10px] border-zinc-800 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-900/60 cursor-pointer"
                              title="Load into workspace"
                            >
                              <Upload className="size-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteBookmark(b.id, b.name)}
                              size="xs"
                              variant="outline"
                              className="h-7 px-2 rounded-md text-[10px] border-red-950 text-red-400 hover:text-red-300 hover:bg-red-950/20 cursor-pointer"
                              title="Delete bookmark"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: Export */}
              <TabsContent value="export" className="mt-0 focus-visible:outline-none flex flex-col h-[480px]">
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-2.5 h-full">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2 shrink-0">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
                      Export Configuration
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 bg-zinc-950/60 p-[2px] rounded-lg border border-zinc-800/40">
                        <button
                          onClick={() => setExportFormat("json")}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-medium rounded transition-all",
                            exportFormat === "json" 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => setExportFormat("javascript")}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-medium rounded transition-all",
                            exportFormat === "javascript" 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          JS Object
                        </button>
                      </div>
                      <Button
                        onClick={handleCopy}
                        size="xs"
                        variant="secondary"
                        className="h-6 gap-1 rounded bg-zinc-800 hover:bg-zinc-700/80 border-0"
                      >
                        {copied ? (
                          <>
                            <Check className="size-3 text-emerald-400" />
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
                  <div className="relative flex-1 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3 h-full">
                    <textarea
                      readOnly
                      value={exportDataStr()}
                      className="w-full h-full bg-transparent font-mono text-[10px] text-indigo-300 resize-none outline-none overflow-y-auto pr-2"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Import */}
              <TabsContent value="import" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
                      Import Configuration
                    </h3>
                    <Button
                      onClick={handleImport}
                      size="xs"
                      className="h-6 bg-indigo-600 hover:bg-indigo-500 rounded"
                    >
                      Import
                    </Button>
                  </div>
                  <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-3 h-96">
                    <textarea
                      placeholder="Paste JSON config code here to load it onto the canvas..."
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      className="w-full h-full bg-transparent font-mono text-[10px] text-zinc-300 placeholder-zinc-600 resize-none outline-none overflow-y-auto"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Guide */}
              <TabsContent value="guide" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold mb-1 border-b border-zinc-800/40 pb-2">
                    <HelpIcon className="size-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Workspace Guide</span>
                  </div>
                  <ul className="space-y-2.5 text-zinc-400 text-[11px] list-disc list-inside">
                    <li><strong className="text-zinc-300">Click empty canvas:</strong> Add star & auto-connect to current active star.</li>
                    <li><strong className="text-zinc-300">Click existing star:</strong> Connect active star to it, and select it as new active node.</li>
                    <li><strong className="text-zinc-300">Shift+Click existing star:</strong> Toggle connection from active star (without changing active star).</li>
                    <li><strong className="text-zinc-300">Deselect active star:</strong> Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-[10px]">Esc</kbd>.</li>
                    <li><strong className="text-zinc-300">Delete active star:</strong> Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-[10px]">Backspace</kbd> / <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-[10px]">Del</kbd>.</li>
                    <li><strong className="text-zinc-300">Undo last star:</strong> Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-[10px]">Ctrl + Z</kbd>.</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

          </div>
        </div>

        {/* Footer Area */}
        <div className="px-5 sm:px-6 py-3 border-t border-zinc-800/40 flex justify-end gap-3 bg-zinc-900/20 shrink-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs sm:text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl h-9 cursor-pointer"
          >
            Close Workspace
          </Button>
        </div>

      </DialogContent>
    </Dialog>

      <Dialog open={showMapPicker} onOpenChange={setShowMapPicker}>
        <DialogContent className="sm:max-w-[1040px] w-[95vw] h-[88vh] md:h-[740px] p-0 overflow-hidden bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl rounded-2xl flex flex-col font-sans text-white z-60">
          <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800/40 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-wide">
                Select Sky Target Offset
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Click anywhere on the StarMap to set the target center coordinates. Drag to pan, scroll to zoom.
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
                ...(showBookmarks ? bookmarks.map(b => ({
                  name: b.name,
                  description: b.description,
                  redirect: b.redirect,
                  id: b.id,
                  stars: b.stars as any,
                  connections: b.connections as any,
                  icon: b.icon || undefined
                })) : []),
                ...(showCustomPreview ? [currentConstellation] : []),
              ]}
              onMapClick={(ra, dec) => {
                setTargetRa(Number(ra.toFixed(2)));
                setTargetDec(Number(dec.toFixed(2)));
                toast.success(`Offset calibrated to RA: ${ra.toFixed(2)}h, Dec: ${dec.toFixed(2)}°`);
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
                  <span className="absolute size-10 rounded-full border border-indigo-400/40 bg-indigo-500/5 animate-ping opacity-75" />
                  <span className="absolute size-6 rounded-full border border-indigo-300/60 bg-indigo-500/15 animate-pulse" />
                  <span className="size-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]" />
                  
                  {/* Crosshair lines */}
                  <div className="absolute w-14 h-px bg-indigo-400/30" />
                  <div className="absolute h-14 w-px bg-indigo-400/30" />
                  
                  {/* Text Label */}
                  <div className="absolute top-5 left-5 bg-zinc-950/90 border border-zinc-800 px-2 py-0.5 rounded-md text-[9px] font-mono text-zinc-300 shadow-md whitespace-nowrap flex items-center gap-1">
                    <span className="size-1 rounded-full bg-indigo-400 animate-pulse" />
                    Center Point
                  </div>
                </div>
              </div>
            </StarMap>
            
            {/* Floating HUD info panel */}
            <div className="absolute top-4 left-4 z-30 p-3.5 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 shadow-xl flex flex-col gap-1.5 max-w-[280px]">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold font-mono">
                Offset Calibration
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">RA Offset:</span>
                  <span className="text-indigo-400 font-bold">{targetRa.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Dec Offset:</span>
                  <span className="text-indigo-400 font-bold">{targetDec.toFixed(2)}°</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-800/40">
                <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showCustomPreview}
                    onChange={(e) => setShowCustomPreview(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Custom Preview
                </label>
                <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showBookmarks}
                    onChange={(e) => setShowBookmarks(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Saved Bookmarks
                </label>
                <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={showRefConstellations}
                    onChange={(e) => setShowRefConstellations(e.target.checked)}
                    className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 size-3 focus:ring-0 cursor-pointer"
                  />
                  Show Reference Constellations
                </label>
              </div>
              
              <p className="text-[10px] text-zinc-500 leading-normal border-t border-zinc-800/40 pt-2 mt-1 font-sans">
                Click to position the center of the constellation. Your custom constellation is highlighted in real-time.
              </p>
            </div>
          </div>
          
          <div className="px-5 sm:px-6 py-3 border-t border-zinc-800/40 flex justify-end gap-3 bg-zinc-900/20 shrink-0">
            <Button
              onClick={() => setShowMapPicker(false)}
              className="text-xs sm:text-sm font-semibold h-9 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md cursor-pointer"
            >
              Done Calibrating
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
