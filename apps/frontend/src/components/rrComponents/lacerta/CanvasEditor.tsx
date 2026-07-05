"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Type,
  Paintbrush,
  Link as LinkIcon,
  Maximize2,
  Trash2,
  Palette,
  Minus,
  Sparkles,
  Users,
  Code,
  CheckSquare,
  Table as TableIcon,
  Image as ImageIcon,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import {
  encryptFileBuffer,
  encryptMetadataString,
  decryptMetadataString,
} from "@/lib/lacertaCrypto";
import TiptapNode from "./TiptapNode";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuLabel,
  ContextMenuPortal,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Canvas Types
// -----------------------------------------------------------------------------
export type CanvasNodeType = "text" | "drawing" | "graph" | "image" | "table";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  dasharray?: string;
  opacity?: number;
  cap?: "round" | "square" | "butt";
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string; // Holds HTML for Tiptap
  lines?: Stroke[]; // Holds vector lines for drawing card
  color?: string; // Color theme class preset (slate, blue, emerald, amber, rose)
  graphType?: "bar" | "line" | "pie";
  graphData?: { name: string; value: number }[];
  cardStyle?: "document" | "sticky" | "header";
  imageUrl?: string;
  tableData?: string[][];
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toNode: string;
  toSide: "top" | "right" | "bottom" | "left";
  label?: string;
  color?: string;
}

interface Collaborator {
  socketId: string;
  userId?: string;
  username: string;
  cursor?: { x: number; y: number } | null;
}

interface CanvasFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
  isPublic?: boolean;
}

interface CanvasEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: CanvasFileItem | null;
  initialContent: string; // Plaintext JSON canvas
  accessToken: string;
  onSaveSuccess: () => void;
  guestMode?: boolean;
  decryptionKeyStr?: string | null;
}

const COLOR_PRESETS = [
  {
    name: "slate",
    border: "border-border",
    bg: "bg-card/90",
    tag: "bg-muted text-muted-foreground",
  },
  {
    name: "blue",
    border: "border-primary/30",
    bg: "bg-primary/[0.03]",
    tag: "bg-primary/10 text-primary",
  },
  {
    name: "emerald",
    border: "border-success/30",
    bg: "bg-success/[0.03]",
    tag: "bg-success/10 text-success",
  },
  {
    name: "amber",
    border: "border-warning/30",
    bg: "bg-warning/[0.03]",
    tag: "bg-warning/10 text-warning",
  },
  {
    name: "rose",
    border: "border-destructive/30",
    bg: "bg-destructive/[0.03]",
    tag: "bg-destructive/10 text-destructive",
  },
  {
    name: "purple",
    border: "border-purple-500/30 dark:border-purple-400/25",
    bg: "bg-purple-500/[0.03] dark:bg-purple-400/[0.02]",
    tag: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    name: "teal",
    border: "border-teal-500/30 dark:border-teal-400/25",
    bg: "bg-teal-500/[0.03] dark:bg-teal-400/[0.02]",
    tag: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    name: "fuchsia",
    border: "border-fuchsia-500/30 dark:border-fuchsia-400/25",
    bg: "bg-fuchsia-500/[0.03] dark:bg-fuchsia-400/[0.02]",
    tag: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    name: "orange",
    border: "border-orange-500/30 dark:border-orange-400/25",
    bg: "bg-orange-500/[0.03] dark:bg-orange-400/[0.02]",
    tag: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    name: "indigo",
    border: "border-indigo-500/30 dark:border-indigo-400/25",
    bg: "bg-indigo-500/[0.03] dark:bg-indigo-400/[0.02]",
    tag: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
];

export default function CanvasEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
  guestMode = false,
  decryptionKeyStr = null,
}: CanvasEditorProps): React.JSX.Element | null {
  // Canvas viewport states
  const [pan, setPan] = useState<Point>({ x: 100, y: 100 });
  const [zoom, setZoom] = useState<number>(1);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Node manipulation states
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Dragging node
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState<Point>({
    x: 0,
    y: 0,
  });

  // Resizing node
  const [resizeNodeId, setResizeNodeId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<Point>({ x: 0, y: 0 });
  const [resizeInitialSize, setResizeInitialSize] = useState<{
    w: number;
    h: number;
  }>({ w: 0, h: 0 });

  // Drawing Card settings (active draw colors and width settings)
  const [activeDrawColor, setActiveDrawColor] = useState<string>("var(--primary)");
  const [activeDrawWidth, setActiveDrawWidth] = useState<number>(4);
  const [activeBrushType, setActiveBrushType] = useState<"pencil" | "calligraphy" | "highlighter" | "dashed" | "dotted">("pencil");
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [eraserCoords, setEraserCoords] = useState<Point | null>(null);
  const [drawingStroke, setDrawingStroke] = useState<Stroke | null>(null);

  // Connector drawing state
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    side: "top" | "right" | "bottom" | "left";
  } | null>(null);
  const [connectingCursor, setConnectingCursor] = useState<Point>({
    x: 0,
    y: 0,
  });

  // Collaboration States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [guestName, setGuestName] = useState<string>("");
  const [showGuestPrompt, setShowGuestPrompt] = useState<boolean>(
    guestMode && !accessToken,
  );

  // Context Menu States
  const [rightClickPosition, setRightClickPosition] = useState<Point>({
    x: 0,
    y: 0,
  });
  const [rightClickedNodeId, setRightClickedNodeId] = useState<string | null>(
    null,
  );

  // Image insertion dialog state
  const [imagePrompt, setImagePrompt] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Save states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef<boolean>(false); // prevent broadcast loop
  const lastCursorEmitRef = useRef<number>(0);
  const syncedNodeAssetsRef = useRef<Set<string>>(new Set());

  // -----------------------------------------------------------------------------
  // E2EE Helper for Collaboration
  // -----------------------------------------------------------------------------
  const encryptData = useCallback(
    async (payload: any): Promise<string | null> => {
      const cryptoKey = file?.decryptedKey;
      if (!cryptoKey) return null;
      try {
        return await encryptMetadataString(JSON.stringify(payload), cryptoKey);
      } catch (err) {
        console.error("Failed to encrypt socket payload:", err);
        return null;
      }
    },
    [file?.decryptedKey],
  );

  const decryptData = useCallback(
    async (encryptedText: string): Promise<any | null> => {
      const cryptoKey = file?.decryptedKey;
      if (!cryptoKey) return null;
      try {
        const jsonStr = await decryptMetadataString(encryptedText, cryptoKey);
        return JSON.parse(jsonStr);
      } catch (err) {
        console.error("Failed to decrypt socket payload:", err);
        return null;
      }
    },
    [file?.decryptedKey],
  );

  const decryptDataRef = useRef(decryptData);
  const encryptDataRef = useRef(encryptData);
  const accessTokenRef = useRef(accessToken);

  useEffect(() => {
    decryptDataRef.current = decryptData;
    encryptDataRef.current = encryptData;
  }, [decryptData, encryptData]);

  useEffect(() => {
    if (accessToken) {
      accessTokenRef.current = accessToken;
    }
  }, [accessToken]);

  // -----------------------------------------------------------------------------
  // Load initial canvas state
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && initialContent) {
      try {
        const parsed = JSON.parse(initialContent);
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      } catch (err) {
        console.warn(
          "Failed to parse canvas file content, starting empty:",
          err,
        );
        setNodes([]);
        setEdges([]);
      }
      setIsDirty(false);
    }
  }, [isOpen, initialContent]);

  // -----------------------------------------------------------------------------
  // Keyboard listeners for spacebar pan & delete node
  // -----------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "Escape") {
        setSelectedNodeId(null);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      } else if (e.code === "Space") {
        // Prevent spacebar scrolling page when editing text (check if target is input/textarea)
        const isEditing =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement)?.isContentEditable;
        if (!isEditing) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      } else if (e.code === "Delete" || e.code === "Backspace") {
        const isEditing =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement)?.isContentEditable;
        if (!isEditing && selectedNodeId) {
          // Delete selected node and its connections
          setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
          setEdges((prev) =>
            prev.filter(
              (edge) =>
                edge.fromNode !== selectedNodeId &&
                edge.toNode !== selectedNodeId,
            ),
          );
          setSelectedNodeId(null);
          setIsDirty(true);
        }
      } else if (e.shiftKey && selectedNodeId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const isEditing =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          (document.activeElement as HTMLElement)?.isContentEditable;
        if (!isEditing) {
          e.preventDefault();
          const resizeAmount = 15;
          setNodes((prev) =>
            prev.map((n) => {
              if (n.id !== selectedNodeId) return n;
              let nextW = n.width;
              let nextH = n.height;
              if (e.key === "ArrowRight") nextW += resizeAmount;
              if (e.key === "ArrowLeft") nextW = Math.max(220, nextW - resizeAmount);
              if (e.key === "ArrowDown") nextH += resizeAmount;
              if (e.key === "ArrowUp") nextH = Math.max(160, nextH - resizeAmount);
              return { ...n, width: nextW, height: nextH };
            })
          );
          setIsDirty(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedNodeId]);

  // -----------------------------------------------------------------------------
  // Socket.io Real-time Collaboration Setup
  // -----------------------------------------------------------------------------
  const setupSocket = useCallback(
    (nameToUse?: string) => {
      if (!file) return;

      const wsUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const queryParams: any = {};
      const token = accessTokenRef.current;
      if (token) queryParams.token = token;
      if (nameToUse) queryParams.username = nameToUse;

      const newSocket = io(`${wsUrl}/lacerta-collab`, {
        query: queryParams,
        transports: ["websocket"],
      });

      newSocket.on("connect", () => {
        console.log(
          "Lacerta Client Socket connected successfully:",
          newSocket.id,
        );
        newSocket.emit("join-room", { fileId: file.id, username: nameToUse });
      });

      newSocket.on("disconnect", (reason) => {
        console.warn("Lacerta Client Socket disconnected. Reason:", reason);
      });

      newSocket.on("connect_error", (error) => {
        console.error("Lacerta Client Socket connection error:", error);
      });

      newSocket.on("room-members", (members: Collaborator[]) => {
        // Exclude yourself from active lists
        setCollaborators(members.filter((m) => m.socketId !== newSocket.id));
      });

      newSocket.on("user-joined", (member: Collaborator) => {
        setCollaborators((prev) => {
          if (prev.some((m) => m.socketId === member.socketId)) return prev;
          return [...prev, member];
        });
        toast.info(`${member.username} joined the canvas`);
      });

      newSocket.on("user-left", (data: { socketId: string }) => {
        setCollaborators((prev) =>
          prev.filter((m) => m.socketId !== data.socketId),
        );
      });

      newSocket.on(
        "cursor-move",
        (data: {
          x: number;
          y: number;
          username: string;
          senderId: string;
        }) => {
          setCollaborators((prev) =>
            prev.map((c) =>
              c.socketId === data.senderId
                ? { ...c, cursor: { x: data.x, y: data.y } }
                : c,
            ),
          );
        },
      );

      newSocket.on(
        "canvas-update",
        async (data: { encryptedPayload: string; senderId: string }) => {
          const decrypted = await decryptDataRef.current(data.encryptedPayload);
          if (decrypted) {
            isSyncingRef.current = true;
            setNodes((prev) => {
              const incomingNodes = decrypted.nodes || [];
              return incomingNodes.map((incoming: CanvasNode) => {
                const local = prev.find((l) => l.id === incoming.id);
                if (local) {
                  return {
                    ...incoming,
                    text:
                      incoming.text !== undefined ? incoming.text : local.text,
                    imageUrl:
                      incoming.imageUrl !== undefined
                        ? incoming.imageUrl
                        : local.imageUrl,
                    lines:
                      incoming.lines !== undefined
                        ? incoming.lines
                        : local.lines,
                    tableData:
                      incoming.tableData !== undefined
                        ? incoming.tableData
                        : local.tableData,
                  };
                }
                return incoming;
              });
            });
            setEdges(decrypted.edges || []);
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 50);
          }
        },
      );

      newSocket.on(
        "tiptap-update",
        async (data: {
          nodeId: string;
          encryptedPayload: string;
          senderId: string;
        }) => {
          const decrypted = await decryptDataRef.current(data.encryptedPayload);
          if (decrypted && typeof decrypted.text === "string") {
            isSyncingRef.current = true;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === data.nodeId ? { ...n, text: decrypted.text } : n,
              ),
            );
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 50);
          }
        },
      );

      setSocket(newSocket);

      return () => {
        console.log(
          "setupSocket cleanup function running, disconnecting socket:",
          newSocket.id,
        );
        newSocket.disconnect();
      };
    },
    [file?.id],
  );

  // Initialize socket connection
  useEffect(() => {
    console.log(
      "CanvasEditor Socket Effect Triggered. file?.id:",
      file?.id,
      "guestName:",
      guestName,
    );
    if (
      isOpen &&
      file?.id &&
      (!guestMode || accessTokenRef.current || guestName)
    ) {
      console.log("CanvasEditor calling setupSocket...");
      const cleanup = setupSocket(guestName);
      return () => {
        console.log(
          "CanvasEditor Socket Effect Cleanup running, triggering setupSocket cleanup...",
        );
        cleanup?.();
      };
    }
  }, [isOpen, file?.id, guestMode, guestName, setupSocket]);

  // -----------------------------------------------------------------------------
  // Sync changes via websockets when state changes
  // -----------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !file?.id || isSyncingRef.current) return;

    const syncCanvas = async () => {
      // Exclude heavy assets (base64 image strings and long text fields) that have already been synced
      const cleanNodes = nodes.map((n) => {
        const hasSyncedAsset = syncedNodeAssetsRef.current.has(n.id);
        const nodeToSync = { ...n };

        if (hasSyncedAsset) {
          if (nodeToSync.imageUrl?.startsWith("data:")) {
            nodeToSync.imageUrl = undefined;
          }
          if (nodeToSync.text && nodeToSync.text.length > 200) {
            nodeToSync.text = undefined;
          }
        } else {
          if (n.imageUrl || n.text) {
            syncedNodeAssetsRef.current.add(n.id);
          }
        }
        return nodeToSync;
      });

      const payload = { nodes: cleanNodes, edges };
      const encrypted = await encryptDataRef.current(payload);
      if (encrypted) {
        socket.emit("canvas-update", {
          fileId: file.id,
          encryptedPayload: encrypted,
        });
      }
    };

    const timer = setTimeout(syncCanvas, 300); // Debounce real-time broadcast slightly
    return () => clearTimeout(timer);
  }, [nodes, edges, socket, file?.id]);

  // -----------------------------------------------------------------------------
  // E2EE File Saving Function
  // -----------------------------------------------------------------------------
  const handleSave = async (forceClose: boolean = false) => {
    if (!file?.decryptedKey) return;
    setIsSaving(true);

    try {
      const canvasState = { nodes, edges };
      const encoder = new TextEncoder();
      const rawBuffer = encoder.encode(JSON.stringify(canvasState)).buffer;

      // Encrypt file content
      const encryptedBuffer = await encryptFileBuffer(
        rawBuffer,
        file.decryptedKey,
      );

      // Encrypt name and mimetype for metadata
      const encName = await encryptMetadataString(file.name, file.decryptedKey);
      const encType = await encryptMetadataString(
        "application/vnd.jsoncanvas",
        file.decryptedKey,
      );

      const formData = new FormData();
      const blob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      formData.append("file", blob, file.name);
      formData.append("wrappedKey", file.wrappedKey || "");
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);
      if (file.parentId) {
        formData.append("parentId", file.parentId);
      }

      // Guest calls public PUT endpoint using the hash key, owner uses bearer token
      const headers: any = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`,
        {
          method: "PUT",
          headers,
          body: formData,
        },
      );

      if (!res.ok) throw new Error("Failed to save canvas file.");

      toast.success("Canvas saved successfully!");
      setIsDirty(false);
      onSaveSuccess();
      if (forceClose) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save canvas.");
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------------------------------------------------------
  // Viewport Handlers: Zoom, Pan, MouseMove Cursors
  // -----------------------------------------------------------------------------
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (e.shiftKey && selectedNodeId) {
      // Resize the selected node
      const resizeDelta = e.deltaY < 0 ? 20 : -20;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === selectedNodeId
            ? {
                ...n,
                width: Math.max(220, n.width + resizeDelta),
                height: Math.max(160, n.height + resizeDelta),
              }
            : n
        )
      );
      setIsDirty(true);
      return;
    }

    const zoomFactor = 1.08;
    const nextZoom =
      e.deltaY < 0
        ? Math.min(zoom * zoomFactor, 3)
        : Math.max(zoom / zoomFactor, 0.25);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Center zoom on mouse cursor
    const newPanX = mouseX - (mouseX - pan.x) * (nextZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (nextZoom / zoom);

    setZoom(nextZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isBackgroundClicked =
      e.target === containerRef.current ||
      (e.target as HTMLElement).classList.contains("canvas-background");

    // Left-click on canvas background deselects any active card (similar to Escape)
    if (isBackgroundClicked && e.button === 0) {
      setSelectedNodeId(null);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }

    // Start panning if space pressed OR middle click OR empty canvas background clicked
    if (
      isSpacePressed ||
      e.button === 1 ||
      isBackgroundClicked
    ) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Calculate canvas local coordinate of cursor
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - pan.x) / zoom;
      const localY = (e.clientY - rect.top - pan.y) / zoom;

      // Broadcast cursor move to socket collaborators (throttled to 50ms to prevent flooding)
      if (socket) {
        const now = Date.now();
        if (now - lastCursorEmitRef.current > 50) {
          socket.emit("cursor-move", {
            fileId: file?.id,
            x: localX,
            y: localY,
          });
          lastCursorEmitRef.current = now;
        }
      }

      // Update dragging node position
      if (dragNodeId) {
        const dx = (e.clientX - dragStart.x) / zoom;
        const dy = (e.clientY - dragStart.y) / zoom;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragNodeId
              ? {
                  ...n,
                  x: dragNodeInitialPos.x + dx,
                  y: dragNodeInitialPos.y + dy,
                }
              : n,
          ),
        );
        setIsDirty(true);
      }

      // Update resizing node dimensions
      if (resizeNodeId) {
        const dx = (e.clientX - resizeStart.x) / zoom;
        const dy = (e.clientY - resizeStart.y) / zoom;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === resizeNodeId
              ? {
                  ...n,
                  width: Math.max(220, resizeInitialSize.w + dx),
                  height: Math.max(160, resizeInitialSize.h + dy),
                }
              : n,
          ),
        );
        setIsDirty(true);
      }

      // Update active connection connector guide line
      if (connecting) {
        setConnectingCursor({ x: localX, y: localY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragNodeId(null);
    setResizeNodeId(null);
    setConnecting(null);
  };

  // -----------------------------------------------------------------------------
  // Node Creation, Color, Size, and Connection Handlers
  // -----------------------------------------------------------------------------
  const createNode = (type: CanvasNodeType) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Place node in center of current viewport
    const centerX = (-pan.x + rect.width / 2) / zoom - 150;
    const centerY = (-pan.y + rect.height / 2) / zoom - 100;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type,
      x: centerX,
      y: centerY,
      width: type === "text" ? 300 : 340,
      height: type === "text" ? 220 : 250,
      text: type === "text" ? "<p>Start typing here...</p>" : "",
      lines: type === "drawing" ? [] : undefined,
      color: "slate",
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsDirty(true);
  };

  const createNodeAtPos = (
    type: CanvasNodeType,
    x: number,
    y: number,
    initialText?: string,
    cardStyle?: "document" | "sticky" | "header",
    imageUrl?: string,
    tableData?: string[][],
  ) => {
    const defaultWidth =
      type === "text"
        ? cardStyle === "sticky"
          ? 240
          : 300
        : type === "image"
          ? 320
          : type === "table"
            ? 380
            : 340;
    const defaultHeight =
      type === "text"
        ? cardStyle === "sticky"
          ? 240
          : cardStyle === "header"
            ? 80
            : 220
        : type === "image"
          ? 240
          : type === "table"
            ? 220
            : 250;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type,
      x: x - defaultWidth / 2,
      y: y - defaultHeight / 2,
      width: defaultWidth,
      height: defaultHeight,
      text:
        type === "text"
          ? initialText ||
            (cardStyle === "header"
              ? "<h1>Title</h1>"
              : cardStyle === "sticky"
                ? "<p>Sticky note...</p>"
                : "<p>Start typing here...</p>")
          : undefined,
      lines: type === "drawing" ? [] : undefined,
      color: cardStyle === "sticky" ? "amber" : "slate",
      cardStyle: type === "text" ? cardStyle || "document" : undefined,
      imageUrl: type === "image" ? imageUrl : undefined,
      tableData:
        type === "table"
          ? tableData || [
              ["Header 1", "Header 2"],
              ["Cell 1", "Cell 2"],
              ["Cell 3", "Cell 4"],
            ]
          : undefined,
    };

    if (type === "graph") {
      newNode.width = 380;
      newNode.height = 340;
      newNode.x = x - 190;
      newNode.y = y - 170;
      newNode.graphType = "bar";
      newNode.graphData = [
        { name: "A", value: 30 },
        { name: "B", value: 70 },
        { name: "C", value: 45 },
        { name: "D", value: 90 },
      ];
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsDirty(true);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Convert screen coordinates to canvas local coordinates (accounting for zoom and pan)
    const localX = (e.clientX - rect.left - pan.x) / zoom;
    const localY = (e.clientY - rect.top - pan.y) / zoom;

    setRightClickPosition({ x: localX, y: localY });

    const target = e.target as HTMLElement;
    const cardEl = target.closest("[data-card-id]");
    if (cardEl) {
      const cardId = cardEl.getAttribute("data-card-id");
      setRightClickedNodeId(cardId);
    } else {
      setRightClickedNodeId(null);
    }
  };

  const handleNodeColorChange = (id: string, color: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
    setIsDirty(true);
  };

  const handleNodeDelete = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) =>
      prev.filter((edge) => edge.fromNode !== id && edge.toNode !== id),
    );
    if (selectedNodeId === id) setSelectedNodeId(null);
    setIsDirty(true);
  };

  const startDragNode = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (isSpacePressed) return; // ignore dragging if panning
    
    // If card is already selected, prevent dragging unless Ctrl or Meta key is held down
    if (selectedNodeId === node.id && !e.ctrlKey && !e.metaKey) {
      return;
    }

    setSelectedNodeId(node.id);
    setDragNodeId(node.id);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragNodeInitialPos({ x: node.x, y: node.y });
  };

  const startResizeNode = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeNodeId(node.id);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setResizeInitialSize({ w: node.width, h: node.height });
  };

  const startConnecting = (
    e: React.MouseEvent,
    nodeId: string,
    side: "top" | "right" | "bottom" | "left",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = (e.clientX - rect.left - pan.x) / zoom;
    const localY = (e.clientY - rect.top - pan.y) / zoom;

    setConnecting({ fromNodeId: nodeId, side });
    setConnectingCursor({ x: localX, y: localY });
  };

  const completeConnection = (
    e: React.MouseEvent,
    toNodeId: string,
    toSide: "top" | "right" | "bottom" | "left",
  ) => {
    e.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === toNodeId) {
      setConnecting(null);
      return;
    }

    const newEdge: CanvasEdge = {
      id: `edge-${Date.now()}`,
      fromNode: connecting.fromNodeId,
      fromSide: connecting.side,
      toNode: toNodeId,
      toSide: toSide,
    };

    setEdges((prev) => {
      // Avoid duplicate edges
      const exists = prev.some(
        (edge) =>
          edge.fromNode === newEdge.fromNode &&
          edge.toNode === newEdge.toNode &&
          edge.fromSide === newEdge.fromSide &&
          edge.toSide === newEdge.toSide,
      );
      if (exists) return prev;
      return [...prev, newEdge];
    });

    setIsDirty(true);
    setConnecting(null);
  };

  // -----------------------------------------------------------------------------
  // Drawing Canvas Node Handlers
  // -----------------------------------------------------------------------------
  const getLocalDrawingCoords = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    node: CanvasNode,
  ): Point | null => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coordinates to node-local coordinates (taking zoom into account)
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const eraseLinesAtCoords = (coords: Point, node: CanvasNode) => {
    // Eraser size scales with selected brush width (minimum 12px, maximum 60px)
    const ERASE_RADIUS = Math.min(60, Math.max(12, activeDrawWidth * 1.6));
    const lines = node.lines || [];
    let linesChanged = false;
    const newLines: Stroke[] = [];

    for (const line of lines) {
      const segments: Point[][] = [];
      let currentSegment: Point[] = [];

      for (const p of line.points) {
        const dist = Math.hypot(p.x - coords.x, p.y - coords.y);
        const isErased = dist <= ERASE_RADIUS;

        if (isErased) {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
          linesChanged = true;
        } else {
          currentSegment.push(p);
        }
      }

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      // Convert segments back into strokes
      for (const seg of segments) {
        if (seg.length > 0) {
          newLines.push({
            ...line,
            points: seg,
          });
        }
      }
    }

    if (linesChanged) {
      setNodes((prev) =>
        prev.map((n) => (n.id === node.id ? { ...n, lines: newLines } : n)),
      );
      setIsDirty(true);
    }
  };

  const handleDrawingStart = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    node: CanvasNode,
  ) => {
    e.stopPropagation();

    // Check for middle click (button === 1) to erase instead of draw
    if ("button" in e && e.button === 1) {
      e.preventDefault();
      setIsErasing(true);
      const coords = getLocalDrawingCoords(e, node);
      if (coords) {
        setEraserCoords(coords);
        eraseLinesAtCoords(coords, node);
      }
      return;
    }

    const coords = getLocalDrawingCoords(e, node);
    if (!coords) return;

    let dasharray: string | undefined = undefined;
    let opacity: number | undefined = undefined;
    let cap: "round" | "square" | "butt" = "round";

    if (activeBrushType === "dashed") {
      dasharray = "8 8";
    } else if (activeBrushType === "dotted") {
      dasharray = "1 8";
    } else if (activeBrushType === "highlighter") {
      opacity = 0.45;
      cap = "square";
    } else if (activeBrushType === "calligraphy") {
      opacity = 0.85;
      cap = "square";
    }

    setDrawingStroke({
      points: [coords],
      color: activeDrawColor,
      width: activeDrawWidth,
      dasharray,
      opacity,
      cap,
    });
  };

  const handleDrawingMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
    node: CanvasNode,
  ) => {
    e.stopPropagation();

    // Handle active eraser operation
    if (isErasing || ("buttons" in e && e.buttons === 4)) {
      if ("preventDefault" in e) e.preventDefault();
      const coords = getLocalDrawingCoords(e, node);
      if (coords) {
        setEraserCoords(coords);
        eraseLinesAtCoords(coords, node);
      }
      return;
    }

    if (!drawingStroke) return;
    const coords = getLocalDrawingCoords(e, node);
    if (!coords) return;

    setDrawingStroke({
      ...drawingStroke,
      points: [...drawingStroke.points, coords],
    });
  };

  const handleDrawingEnd = (node: CanvasNode) => {
    if (isErasing) {
      setIsErasing(false);
      setEraserCoords(null);
      return;
    }
    if (drawingStroke && drawingStroke.points.length > 1) {
      const nodeLines = node.lines || [];
      setNodes((prev) =>
        prev.map((n) =>
          n.id === node.id ? { ...n, lines: [...nodeLines, drawingStroke] } : n,
        ),
      );
      setIsDirty(true);
    }
    setDrawingStroke(null);
  };

  const handleDrawingClear = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, lines: [] } : n)),
    );
    setIsDirty(true);
  };

  // -----------------------------------------------------------------------------
  // Connection Point Positioning Helpers
  // -----------------------------------------------------------------------------
  const getPortCoordinates = useCallback(
    (nodeId: string, side: "top" | "right" | "bottom" | "left"): Point => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };

      switch (side) {
        case "top":
          return { x: node.x + node.width / 2, y: node.y };
        case "right":
          return { x: node.x + node.width, y: node.y + node.height / 2 };
        case "bottom":
          return { x: node.x + node.width / 2, y: node.y + node.height };
        case "left":
          return { x: node.x, y: node.y + node.height / 2 };
      }
    },
    [nodes],
  );

  // -----------------------------------------------------------------------------
  // Render Connector Curves (Bezier paths)
  // -----------------------------------------------------------------------------
  const renderConnector = (edge: CanvasEdge) => {
    const start = getPortCoordinates(edge.fromNode, edge.fromSide);
    const end = getPortCoordinates(edge.toNode, edge.toSide);

    // Control points offset
    const dx = Math.abs(end.x - start.x) * 0.4;
    const dy = Math.abs(end.y - start.y) * 0.4;

    let cp1x = start.x;
    let cp1y = start.y;
    let cp2x = end.x;
    let cp2y = end.y;

    if (edge.fromSide === "right") cp1x += dx;
    else if (edge.fromSide === "left") cp1x -= dx;
    else if (edge.fromSide === "bottom") cp1y += dy;
    else if (edge.fromSide === "top") cp1y -= dy;

    if (edge.toSide === "right") cp2x += dx;
    else if (edge.toSide === "left") cp2x -= dx;
    else if (edge.toSide === "bottom") cp2y += dy;
    else if (edge.toSide === "top") cp2y -= dy;

    const pathD = `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;

    return (
      <g key={edge.id} className="group/edge">
        {/* Hover area */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={15}
          className="cursor-pointer"
          onClick={() => {
            setEdges((prev) => prev.filter((e) => e.id !== edge.id));
            setIsDirty(true);
          }}
        />
        {/* Rendered line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-edge, #6366f1)"
          strokeWidth={2}
          strokeLinecap="round"
          className="stroke-indigo-400 dark:stroke-indigo-600 transition-colors pointer-events-none group-hover/edge:stroke-rose-500"
          markerEnd="url(#arrow)"
        />
      </g>
    );
  };

  const handleTextChange = (id: string, html: string) => {
    // Only broadcast via websocket when text is changed
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text: html } : n)),
    );
    setIsDirty(true);

    if (socket && file) {
      encryptData({ text: html }).then((encrypted) => {
        if (encrypted) {
          socket.emit("tiptap-update", {
            fileId: file.id,
            nodeId: id,
            encryptedPayload: encrypted,
          });
        }
      });
    }
  };

  if (!isOpen || !file) return null;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="w-full h-full"
        onContextMenu={handleContextMenu}
      >
        <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground font-sans overflow-hidden select-none">
          {/* Top Banner Toolbar */}
          <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (
                    isDirty &&
                    !confirm("You have unsaved changes. Exit anyway?")
                  )
                    return;
                  onClose();
                }}
                className="p-1.5 border border-border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    E2EE Spatial Canvas
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toolbar removed, insertion handled by right-click menu */}
            </div>

            {/* Action controls & Collaborators */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border text-[10px] text-muted-foreground">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {collaborators.length + 1} online
                </span>
                <div className="flex items-center -space-x-1.5 ml-1">
                  <div className="h-4.5 w-4.5 rounded-full bg-primary border border-background flex items-center justify-center font-bold text-[8px] text-primary-foreground">
                    You
                  </div>
                  {collaborators.map((c) => (
                    <div
                      key={c.socketId}
                      className="h-4.5 w-4.5 rounded-full bg-success border border-background flex items-center justify-center font-bold text-[8px] text-success-foreground uppercase"
                      title={c.username}
                    >
                      {c.username.substring(0, 1)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-[10px] text-warning italic mr-1">
                    Unsaved Changes
                  </span>
                )}
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/75 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          {/* Infinite Canvas Window */}
          <div
            ref={containerRef}
            className="flex-1 w-full h-full relative overflow-hidden bg-muted/10 cursor-grab active:cursor-grabbing canvas-background"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* SVG Dot grid background */}
            <div className="absolute inset-0 pointer-events-none canvas-background">
              <svg className="w-full h-full">
                <defs>
                  <pattern
                    id="canvas-grid"
                    width={30 * zoom}
                    height={30 * zoom}
                    patternUnits="userSpaceOnUse"
                  >
                    <circle
                      cx={1 * zoom}
                      cy={1 * zoom}
                      r={1 * zoom}
                      fill="currentColor"
                      className="text-foreground/10"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#canvas-grid)" />
              </svg>
            </div>

            {/* Floating Canvas Transform Wrapper */}
            <div
              className="absolute origin-top-left pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            >
              <div className="relative w-0 h-0 pointer-events-auto">
                {/* SVG Layer for rendering connectors */}
                <svg className="absolute overflow-visible pointer-events-none w-0 h-0 z-0">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
                    </marker>
                  </defs>

                  {/* Saved edges */}
                  {edges.map((edge) => renderConnector(edge))}

                  {/* Temporary edge drawing guide line */}
                  {connecting && (
                    <line
                      x1={
                        getPortCoordinates(
                          connecting.fromNodeId,
                          connecting.side,
                        ).x
                      }
                      y1={
                        getPortCoordinates(
                          connecting.fromNodeId,
                          connecting.side,
                        ).y
                      }
                      x2={connectingCursor.x}
                      y2={connectingCursor.y}
                      stroke="var(--success)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      markerEnd="url(#arrow)"
                    />
                  )}
                </svg>

                {/* Render Nodes */}
                {nodes.map((node) => {
                  const preset =
                    COLOR_PRESETS.find((p) => p.name === node.color) ||
                    COLOR_PRESETS[0];

                  return (
                    <React.Fragment key={node.id}>
                      <div
                        data-card-id={node.id}
                        onMouseDown={(e) => startDragNode(e, node)}
                        className={(() => {
                          let cls = `absolute flex flex-col overflow-hidden pointer-events-auto group transition-all `;
                          if (node.cardStyle === "header") {
                            cls += cn(
                              "border-0 bg-transparent shadow-none",
                              selectedNodeId === node.id
                                ? "ring-1 ring-primary/50"
                                : "",
                            );
                          } else if (node.cardStyle === "sticky") {
                            cls += cn(
                              "rounded-lg border bg-warning/8 text-foreground shadow-xl transition-all",
                              selectedNodeId === node.id
                                ? "border-t-[6px] border-t-warning border-warning/40 ring-2 ring-primary shadow-lg"
                                : "border-transparent hover:border-t-[6px] hover:border-t-warning hover:border-warning/40 hover:shadow-md",
                            );
                          } else {
                            // Standard card styling
                            cls += cn(
                              "rounded-2xl border bg-card text-card-foreground shadow-xl transition-all",
                              preset.bg,
                              selectedNodeId === node.id
                                ? cn("ring-2 ring-primary shadow-lg", preset.border)
                                : "border-transparent hover:border-border hover:shadow-md",
                            );
                          }
                          return cls;
                        })()}
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.width,
                        height: node.height,
                      }}
                    >
                      {/* Card Content Area */}
                      <div
                        className={cn(
                          "flex-1 w-full h-full overflow-hidden flex flex-col",
                          node.cardStyle === "sticky"
                            ? "bg-warning/5 text-foreground"
                            : node.cardStyle === "header"
                              ? "bg-transparent text-foreground font-extrabold text-xl"
                              : "bg-card/50 backdrop-blur-md",
                        )}
                      >
                        {node.type === "text" ? (
                          <div
                            className="flex-1 w-full h-full overflow-hidden"
                            onMouseDown={(e) => {
                              if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
                            }}
                          >
                            <TiptapNode
                              content={node.text || ""}
                              onChange={(html) => handleTextChange(node.id, html)}
                            />
                          </div>
                        ) : node.type === "image" ? (
                          // Dedicated Image Card rendering
                          <div
                            className="relative w-full h-full flex flex-col bg-slate-950/50"
                            onMouseDown={(e) => {
                              if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
                            }}
                          >
                            {node.imageUrl ? (
                              <img
                                src={node.imageUrl}
                                alt="Spatial Image"
                                className="w-full h-full object-contain select-none pointer-events-none"
                              />
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                                <ImageIcon className="h-8 w-8 text-slate-700" />
                                <span className="text-[10px] font-semibold">
                                  No Image Loaded
                                </span>
                              </div>
                            )}
                          </div>
                        ) : node.type === "table" ? (
                          // Custom Table Card rendering
                          <div
                            className="relative w-full h-full flex flex-col p-3 text-foreground bg-card/65 overflow-hidden"
                            onMouseDown={(e) => {
                              if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5 shrink-0">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                Spreadsheet Grid
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    setNodes((prev) =>
                                      prev.map((n) => {
                                        if (n.id !== node.id) return n;
                                        const current = n.tableData || [
                                          ["", ""],
                                        ];
                                        const cols = current[0]?.length || 2;
                                        return {
                                          ...n,
                                          tableData: [
                                            ...current,
                                            Array(cols).fill(""),
                                          ],
                                        };
                                      }),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-primary transition-all active:scale-95"
                                >
                                  + Row
                                </button>
                                <button
                                  onClick={() => {
                                    setNodes((prev) =>
                                      prev.map((n) => {
                                        if (n.id !== node.id) return n;
                                        const current = n.tableData || [
                                          ["", ""],
                                        ];
                                        return {
                                          ...n,
                                          tableData: current.map((row) => [
                                            ...row,
                                            "",
                                          ]),
                                        };
                                      }),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-success transition-all active:scale-95"
                                >
                                  + Col
                                </button>
                                <button
                                  onClick={() => {
                                    setNodes((prev) =>
                                      prev.map((n) => {
                                        if (n.id !== node.id) return n;
                                        const current = n.tableData || [
                                          ["", ""],
                                        ];
                                        if (current.length <= 1) return n;
                                        return {
                                          ...n,
                                          tableData: current.slice(0, -1),
                                        };
                                      }),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-destructive transition-all active:scale-95"
                                >
                                  - Row
                                </button>
                                <button
                                  onClick={() => {
                                    setNodes((prev) =>
                                      prev.map((n) => {
                                        if (n.id !== node.id) return n;
                                        const current = n.tableData || [
                                          ["", ""],
                                        ];
                                        if ((current[0]?.length || 0) <= 1)
                                          return n;
                                        return {
                                          ...n,
                                          tableData: current.map((row) =>
                                            row.slice(0, -1),
                                          ),
                                        };
                                      }),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-warning transition-all active:scale-95"
                                >
                                  - Col
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 overflow-auto min-h-0">
                              <table className="w-full border-collapse border border-border text-[10px]">
                                <tbody>
                                  {(node.tableData || [["", ""]]).map(
                                    (row, rIdx) => (
                                      <tr
                                        key={rIdx}
                                        className="border-b border-border hover:bg-muted/30 transition-colors"
                                      >
                                        {row.map((cell, cIdx) => (
                                          <td
                                            key={cIdx}
                                            className="border-r border-border p-0.5"
                                          >
                                            <input
                                              type="text"
                                              value={cell}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setNodes((prev) =>
                                                  prev.map((n) => {
                                                    if (n.id !== node.id)
                                                      return n;
                                                    const nextTable = (
                                                      n.tableData || [["", ""]]
                                                    ).map((r, ri) =>
                                                      r.map((c, ci) =>
                                                        ri === rIdx &&
                                                        ci === cIdx
                                                          ? val
                                                          : c,
                                                      ),
                                                    );
                                                    return {
                                                      ...n,
                                                      tableData: nextTable,
                                                    };
                                                  }),
                                                );
                                                setIsDirty(true);
                                              }}
                                              className="w-full bg-transparent border-0 px-1 py-0.5 text-[9px] text-foreground focus:outline-none focus:bg-muted font-medium"
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : node.type === "graph" ? (
                          // Interactive Chart Renderer
                          <div
                            className="relative w-full h-full flex flex-col p-3 text-foreground bg-card/65"
                            onMouseDown={(e) => {
                              if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
                            }}
                          >
                            <div className="flex-1 w-full min-h-0 text-muted-foreground">
                              <ResponsiveContainer width="100%" height="100%">
                                {node.graphType === "line" ? (
                                  <LineChart
                                    data={node.graphData || []}
                                    margin={{
                                      top: 5,
                                      right: 10,
                                      left: -32,
                                      bottom: 0,
                                    }}
                                  >
                                    <XAxis
                                      dataKey="name"
                                      stroke="var(--muted-foreground)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <YAxis
                                      stroke="var(--muted-foreground)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        background: "var(--popover)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius)",
                                        fontSize: "9px",
                                        color: "var(--popover-foreground)",
                                      }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="value"
                                      stroke="var(--primary)"
                                      strokeWidth={2}
                                      dot={{ r: 2 }}
                                      activeDot={{ r: 4 }}
                                    />
                                  </LineChart>
                                ) : node.graphType === "pie" ? (
                                  <PieChart>
                                    <Tooltip
                                      contentStyle={{
                                        background: "var(--popover)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius)",
                                        fontSize: "9px",
                                        color: "var(--popover-foreground)",
                                      }}
                                    />
                                    <Pie
                                      data={node.graphData || []}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={42}
                                      fill="var(--primary)"
                                      label={({ name, percent }) =>
                                        `${name} ${(((percent ?? 0) * 100)).toFixed(0)}%`
                                      }
                                      labelLine={false}
                                      style={{
                                        fontSize: "7px",
                                        fill: "var(--muted-foreground)",
                                      }}
                                    >
                                      {(node.graphData || []).map(
                                        (entry, index) => {
                                          const colors = [
                                            "var(--primary)",
                                            "var(--success)",
                                            "var(--warning)",
                                            "var(--destructive)",
                                            "var(--muted-foreground)",
                                          ];
                                          return (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={
                                                colors[index % colors.length]
                                              }
                                            />
                                          );
                                        },
                                      )}
                                    </Pie>
                                  </PieChart>
                                ) : (
                                  <BarChart
                                    data={node.graphData || []}
                                    margin={{
                                      top: 5,
                                      right: 10,
                                      left: -32,
                                      bottom: 0,
                                    }}
                                  >
                                    <XAxis
                                      dataKey="name"
                                      stroke="var(--muted-foreground)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <YAxis
                                      stroke="var(--muted-foreground)"
                                      fontSize={8}
                                      tickLine={false}
                                      axisLine={false}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        background: "var(--popover)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius)",
                                        fontSize: "9px",
                                        color: "var(--popover-foreground)",
                                      }}
                                    />
                                    <Bar
                                      dataKey="value"
                                      fill="var(--primary)"
                                      radius={[3, 3, 0, 0]}
                                    />
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ) : (
                          // Whiteboard Sketchpad Renderer
                          <div
                            className="relative w-full h-full flex flex-col"
                            onMouseDown={(e) => {
                              if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b border-border shrink-0 text-[10px]" onMouseDown={(e) => { if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); }}>
                              <span className="font-semibold text-muted-foreground">
                                Sketchpad
                              </span>
                              
                              <div className="flex items-center gap-3">
                                {/* Drawing Color Presets */}
                                <div className="flex items-center gap-1">
                                  {[
                                    { color: "var(--primary)", label: "Primary" },
                                    { color: "#3b82f6", label: "Blue" },
                                    { color: "var(--success)", label: "Green" },
                                    { color: "var(--warning)", label: "Orange" },
                                    { color: "var(--destructive)", label: "Red" },
                                    { color: "var(--foreground)", label: "Text" }
                                  ].map((c) => (
                                    <button
                                      key={c.color}
                                      onClick={() => setActiveDrawColor(c.color)}
                                      className={cn(
                                        "w-3 h-3 rounded-full border border-border/40 transition-all active:scale-90",
                                        activeDrawColor === c.color ? "ring-2 ring-primary scale-110" : ""
                                      )}
                                      style={{ backgroundColor: c.color.startsWith("var") ? `var(${c.color.match(/\(([^)]+)\)/)?.[1] || ""})` : c.color }}
                                      title={c.label}
                                    />
                                  ))}
                                  
                                  {/* Custom Color Button with Picker */}
                                  <div 
                                    className={cn(
                                      "relative w-3 h-3 rounded-full border border-border/40 cursor-pointer transition-all active:scale-90 flex items-center justify-center",
                                      !["var(--primary)", "#3b82f6", "var(--success)", "var(--warning)", "var(--destructive)", "var(--foreground)"].includes(activeDrawColor) ? "ring-2 ring-primary scale-110" : ""
                                    )}
                                    style={{ 
                                      backgroundColor: !["var(--primary)", "#3b82f6", "var(--success)", "var(--warning)", "var(--destructive)", "var(--foreground)"].includes(activeDrawColor) ? activeDrawColor : "transparent"
                                    }}
                                    title="Custom Color"
                                  >
                                    {["var(--primary)", "#3b82f6", "var(--success)", "var(--warning)", "var(--destructive)", "var(--foreground)"].includes(activeDrawColor) && (
                                      <Palette className="w-2 h-2 text-muted-foreground" />
                                    )}
                                    <input
                                      type="color"
                                      value={activeDrawColor.startsWith("var") ? "#6366f1" : activeDrawColor}
                                      onChange={(e) => setActiveDrawColor(e.target.value)}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                  </div>
                                </div>

                                {/* Size Slider */}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <span className="text-[8px] font-medium min-w-[20px] text-right">{activeDrawWidth}px</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="40"
                                    value={activeDrawWidth}
                                    onChange={(e) => setActiveDrawWidth(Number(e.target.value))}
                                    className="w-14 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    title="Brush Size"
                                  />
                                </div>

                                {/* Brush Type Selector */}
                                <select
                                  value={activeBrushType}
                                  onChange={(e) => setActiveBrushType(e.target.value as any)}
                                  className="bg-background border border-border rounded px-1.5 py-0.5 text-[8px] font-medium text-foreground focus:outline-none cursor-pointer"
                                >
                                  <option value="pencil">✏️ Pencil</option>
                                  <option value="calligraphy">✒️ Calligraphy</option>
                                  <option value="highlighter">🖍️ Highlighter</option>
                                  <option value="dashed">➖ Dashed</option>
                                  <option value="dotted">💬 Dotted</option>
                                </select>

                                <button
                                  onClick={(e) => handleDrawingClear(e, node.id)}
                                  className="px-2 py-0.5 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded text-[9px] font-medium transition-all"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                            <svg
                              className={cn(
                                "flex-1 w-full h-full bg-muted/5 touch-none select-none",
                                isErasing ? "cursor-cell" : "cursor-crosshair"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedNodeId(node.id);
                                handleDrawingStart(e, node);
                              }}
                              onMouseMove={(e) => handleDrawingMove(e, node)}
                              onMouseUp={() => handleDrawingEnd(node)}
                              onMouseLeave={() => handleDrawingEnd(node)}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                setSelectedNodeId(node.id);
                                handleDrawingStart(e, node);
                              }}
                              onTouchMove={(e) => handleDrawingMove(e, node)}
                              onTouchEnd={() => handleDrawingEnd(node)}
                            >
                              {/* Saved sketches */}
                              {(node.lines || []).map((l, i) => (
                                <path
                                  key={i}
                                  d={`M ${l.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                                  fill="none"
                                  stroke={l.color}
                                  strokeWidth={l.width}
                                  strokeDasharray={l.dasharray}
                                  strokeOpacity={l.opacity}
                                  strokeLinecap={l.cap || "round"}
                                  strokeLinejoin="round"
                                />
                              ))}
                              {/* Real-time drawing line preview */}
                              {drawingStroke && selectedNodeId === node.id && (
                                <path
                                  d={`M ${drawingStroke.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
                                  fill="none"
                                  stroke={drawingStroke.color}
                                  strokeWidth={drawingStroke.width}
                                  strokeDasharray={drawingStroke.dasharray}
                                  strokeOpacity={drawingStroke.opacity}
                                  strokeLinecap={drawingStroke.cap || "round"}
                                  strokeLinejoin="round"
                                />
                              )}

                              {/* Real-time eraser preview outline */}
                              {isErasing && eraserCoords && selectedNodeId === node.id && (
                                <circle
                                  cx={eraserCoords.x}
                                  cy={eraserCoords.y}
                                  r={Math.min(60, Math.max(12, activeDrawWidth * 1.6))}
                                  fill="rgba(239, 68, 68, 0.12)"
                                  stroke="rgba(239, 68, 68, 0.75)"
                                  strokeWidth={1.2}
                                  strokeDasharray="3 2"
                                  pointerEvents="none"
                                />
                              )}
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Resizing Anchor (Bottom-Right) */}
                      <div
                        onMouseDown={(e) => startResizeNode(e, node)}
                        className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="h-2.5 w-2.5 rotate-90" />
                      </div>

                      {/* Drag-Connector Ports (Visible on hover) */}
                      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div
                          onMouseDown={(e) =>
                            startConnecting(e, node.id, "top")
                          }
                          onMouseUp={(e) =>
                            completeConnection(e, node.id, "top")
                          }
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-3.5 h-3.5 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center"
                        />
                        <div
                          onMouseDown={(e) =>
                            startConnecting(e, node.id, "right")
                          }
                          onMouseUp={(e) =>
                            completeConnection(e, node.id, "right")
                          }
                          className="absolute right-0 top-1/2 translate-x-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center"
                        />
                        <div
                          onMouseDown={(e) =>
                            startConnecting(e, node.id, "bottom")
                          }
                          onMouseUp={(e) =>
                            completeConnection(e, node.id, "bottom")
                          }
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 w-3.5 h-3.5 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center"
                        />
                        <div
                          onMouseDown={(e) =>
                            startConnecting(e, node.id, "left")
                          }
                          onMouseUp={(e) =>
                            completeConnection(e, node.id, "left")
                          }
                          className="absolute left-0 top-1/2 -translate-x-1.5 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-md flex items-center justify-center"
                        />
                      </div>
                    </div>

                    {/* Chart Settings Floating Panel */}
                      {node.type === "graph" && selectedNodeId === node.id && (
                        <div
                          className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all w-[260px]"
                          style={{
                            left: node.x + node.width + 12,
                            top: node.y,
                            height: node.height,
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-border pb-2 mb-2 shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Chart Settings
                            </span>
                            <div className="flex gap-1">
                              {(["bar", "line", "pie"] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === node.id ? { ...n, graphType: t } : n,
                                      ),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase",
                                    node.graphType === t
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted hover:bg-muted/80 text-muted-foreground",
                                  )}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Editor list */}
                          <div className="flex-1 overflow-y-auto pr-1">
                            <div className="flex flex-col gap-1.5">
                              {(node.graphData || []).map((row, idx) => (
                                <div key={idx} className="flex gap-1.5 items-center">
                                  <input
                                    type="text"
                                    value={row.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNodes((prev) =>
                                        prev.map((n) => {
                                          if (n.id !== node.id) return n;
                                          const nextData = [...(n.graphData || [])];
                                          nextData[idx] = { ...nextData[idx], name: val };
                                          return { ...n, graphData: nextData };
                                        }),
                                      );
                                      setIsDirty(true);
                                    }}
                                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[9px] text-foreground focus:outline-none focus:border-primary font-medium"
                                    placeholder="Label"
                                  />
                                  <input
                                    type="number"
                                    value={row.value}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setNodes((prev) =>
                                        prev.map((n) => {
                                          if (n.id !== node.id) return n;
                                          const nextData = [...(n.graphData || [])];
                                          nextData[idx] = { ...nextData[idx], value: val };
                                          return { ...n, graphData: nextData };
                                        }),
                                      );
                                      setIsDirty(true);
                                    }}
                                    className="w-16 bg-background border border-border rounded px-2 py-1 text-[9px] text-foreground focus:outline-none focus:border-primary font-medium"
                                    placeholder="Value"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNodes((prev) =>
                                        prev.map((n) => {
                                          if (n.id !== node.id) return n;
                                          return {
                                            ...n,
                                            graphData: (n.graphData || []).filter((_, i) => i !== idx),
                                          };
                                        }),
                                      );
                                      setIsDirty(true);
                                    }}
                                    className="p-1 hover:bg-destructive/10 text-destructive hover:text-destructive rounded transition-all"
                                    title="Delete Row"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  setNodes((prev) =>
                                    prev.map((n) => {
                                      if (n.id !== node.id) return n;
                                      return {
                                        ...n,
                                        graphData: [
                                          ...(n.graphData || []),
                                          {
                                            name: `Item ${String.fromCharCode(65 + (n.graphData || []).length)}`,
                                            value: 50,
                                          },
                                        ],
                                      };
                                    }),
                                  );
                                  setIsDirty(true);
                                }}
                                className="mt-1 text-[9px] font-semibold text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1.5 border border-dashed border-border hover:border-muted-foreground/35 rounded transition-all"
                              >
                                <Plus className="h-3 w-3" /> Add Data Row
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Collaborator Cursor Pointers */}
                {collaborators.map((c) => {
                  if (!c.cursor) return null;
                  return (
                    <div
                      key={c.socketId}
                      className="absolute pointer-events-none z-30 transition-all duration-75 ease-out"
                      style={{
                        left: c.cursor.x,
                        top: c.cursor.y,
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-emerald-400 fill-current drop-shadow-md"
                      >
                        <path d="M0 0 L16 12 L9 13.5 L16 22 L13 23 L6.5 15 L0 20 Z" />
                      </svg>
                      <div className="absolute top-4 left-3 px-2 py-0.5 bg-emerald-600 border border-emerald-500 text-white text-[8px] font-bold rounded shadow whitespace-nowrap">
                        {c.username}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating Canvas Controls (Zoom in/out, Zoom reset) */}
          <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-card/90 border border-border px-2 py-1.5 rounded-xl shadow-lg backdrop-blur-lg text-muted-foreground select-none">
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.15, 0.25))}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-all"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold font-mono px-1 w-11 text-center select-none text-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.15, 3))}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-lg transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 100, y: 100 });
              }}
              className="px-2 py-1 hover:bg-muted hover:text-foreground rounded-lg text-[9px] font-bold transition-all"
            >
              Reset
            </button>
          </div>

          {/* Guest Username Dialog Prompt */}
          {showGuestPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col">
                <h3 className="text-sm font-bold text-card-foreground">
                  Enter Guest Username
                </h3>
                <p className="text-[11px] text-muted-foreground leading-normal mt-1 mb-4">
                  This is a zero-knowledge collaborative spatial canvas. Choose
                  a username to represent yourself to other editors in the room.
                </p>
                <input
                  type="text"
                  placeholder="e.g. Anonymous Fox"
                  defaultValue={guestName}
                  onChange={(e) => setGuestName(e.target.value.trim())}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all text-center mb-4 font-medium"
                />
                <button
                  onClick={() => {
                    if (guestName.length > 0) {
                      setShowGuestPrompt(false);
                    } else {
                      toast.error("Please enter a username");
                    }
                  }}
                  className="py-2 bg-primary hover:bg-primary/90 font-semibold rounded-lg text-xs text-primary-foreground transition-all shadow-sm active:scale-98"
                >
                  Join Collaboration Session
                </button>
              </div>
            </div>
          )}

          {/* Image Insertion Dialog Prompt */}
          {imagePrompt && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-text"
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div
                className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col select-text"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <h3 className="text-sm font-bold text-card-foreground">
                  Insert Image
                </h3>
                <p className="text-[11px] text-muted-foreground leading-normal mt-1 mb-4">
                  Enter an external image URL, or choose a local file from your
                  device to embed as an E2EE base64 image.
                </p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                      IMAGE URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com/image.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                      OR
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                      UPLOAD LOCAL FILE
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const fileObj = e.target.files?.[0];
                        if (fileObj) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new window.Image();
                            img.onload = () => {
                              // Create canvas to scale down
                              const canvas = document.createElement("canvas");
                              const MAX_WIDTH = 800;
                              const MAX_HEIGHT = 800;
                              let width = img.width;
                              let height = img.height;

                              if (width > height) {
                                if (width > MAX_WIDTH) {
                                  height = Math.round(
                                    (height * MAX_WIDTH) / width,
                                  );
                                  width = MAX_WIDTH;
                                }
                              } else {
                                if (height > MAX_HEIGHT) {
                                  width = Math.round(
                                    (width * MAX_HEIGHT) / height,
                                  );
                                  height = MAX_HEIGHT;
                                }
                              }

                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                const compressedBase64 = canvas.toDataURL(
                                  "image/jpeg",
                                  0.75,
                                ); // compress to JPEG at 75% quality
                                createNodeAtPos(
                                  "image",
                                  imagePrompt.x,
                                  imagePrompt.y,
                                  undefined,
                                  undefined,
                                  compressedBase64,
                                );
                              }
                              setImagePrompt(null);
                              setImageUrl("");
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(fileObj);
                        }
                      }}
                      className="w-full text-xs text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setImagePrompt(null);
                      setImageUrl("");
                    }}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (imageUrl.trim()) {
                        createNodeAtPos(
                          "image",
                          imagePrompt.x,
                          imagePrompt.y,
                          undefined,
                          undefined,
                          imageUrl.trim(),
                        );
                        setImagePrompt(null);
                        setImageUrl("");
                      } else {
                        toast.error("Please enter a URL or select a file");
                      }
                    }}
                    className="px-4 py-1.5 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-all shadow-sm active:scale-98"
                  >
                    Insert URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 bg-popover border border-border text-popover-foreground shadow-lg backdrop-blur-md">
        {rightClickedNodeId ? (
          <>
            <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 text-muted-foreground/75">
              Card Actions
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border" />

            {/* Color preset change */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Palette className="h-3.5 w-3.5 mr-2 text-primary" />
                Change Color
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                  {COLOR_PRESETS.map((p) => (
                    <ContextMenuItem
                      key={p.name}
                      onClick={() =>
                        handleNodeColorChange(rightClickedNodeId, p.name)
                      }
                      className="focus:bg-accent focus:text-accent-foreground cursor-pointer flex items-center px-3 py-1.5 text-xs"
                    >
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full mr-2",
                          p.name === "slate"
                            ? "bg-muted-foreground"
                            : p.name === "blue"
                              ? "bg-primary"
                              : p.name === "emerald"
                                ? "bg-success"
                                : p.name === "amber"
                                  ? "bg-warning"
                                  : p.name === "rose"
                                    ? "bg-destructive"
                                    : p.name === "purple"
                                      ? "bg-purple-500"
                                      : p.name === "teal"
                                        ? "bg-teal-500"
                                        : p.name === "fuchsia"
                                          ? "bg-fuchsia-500"
                                          : p.name === "orange"
                                            ? "bg-orange-500"
                                            : "bg-indigo-500",
                        )}
                      />
                      <span className="capitalize">{p.name}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            <ContextMenuItem
              onClick={() => handleNodeDelete(rightClickedNodeId)}
              className="focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer text-xs font-semibold px-3 py-2"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete Card
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 text-muted-foreground/75">
              Canvas Actions
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border" />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Plus className="h-3.5 w-3.5 mr-2 text-primary" />
                Insert
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[170px]">
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        undefined,
                        "document",
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <Type className="h-3.5 w-3.5 mr-2 text-primary" />
                    Document Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        undefined,
                        "sticky",
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-2 text-warning" />
                    Sticky Note
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        undefined,
                        "header",
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-2 text-primary" />
                    Floating Title
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "drawing",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <Paintbrush className="h-3.5 w-3.5 mr-2 text-success" />
                    Whiteboard Sketchpad
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setImagePrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-2 text-primary" />
                    Image Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        "<pre><code>// Write your code here...\nconsole.log('Hello World!');</code></pre>",
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <Code className="h-3.5 w-3.5 mr-2 text-destructive" />
                    Code Block
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        '<ul data-type="taskList"><li data-checked="false">Task 1</li><li data-checked="false">Task 2</li></ul>',
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-2 text-warning" />
                    Tasks List
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "table",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <TableIcon className="h-3.5 w-3.5 mr-2 text-success" />
                    Table Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "graph",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
                  >
                    <BarChart2 className="h-3.5 w-3.5 mr-2 text-primary" />
                    Interactive Graph
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
