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
  FileText,
  ShieldAlert,
  Smile,
  AlertCircle,
  Heading,
  Network,
  FileDown,
  StickyNote,
  MessageSquare,
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
  decryptFileBuffer,
  unwrapFileKeyForUser,
  importRawKey,
} from "@/lib/lacertaCrypto";
import TiptapNode from "./TiptapNode";
import RrCanvasCardContent from "./canvas-cards/rrCanvasCardContent";
import RrCanvasImageInsertModal from "./rrCanvasImageInsertModal";
import RrCanvasVideoInsertModal from "./rrCanvasVideoInsertModal";
import RrCanvasGifInsertModal from "./rrCanvasGifInsertModal";
import RrCanvasFileInsertModal from "./rrCanvasFileInsertModal";
import RrCanvasPublicShareWarningModal from "./rrCanvasPublicShareWarningModal";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useSession } from "next-auth/react";
import UserProfileCard, { UserProfileInfo } from "./UserProfileCard";
import { Video, Film, ExternalLink, Download, Check } from "lucide-react";
import mermaid from "mermaid";
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
export type CanvasNodeType =
  | "text"
  | "drawing"
  | "graph"
  | "image"
  | "table"
  | "mermaid"
  | "uml"
  | "gif"
  | "video"
  | "file"
  | "emoji"
  | "pdf"
  | "callout"
  | "annotation"
  | "group";

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

  // Custom Card Properties
  mermaidCode?: string;
  gifUrl?: string;
  videoUrl?: string;
  lacertaFileId?: string;
  lacertaFileName?: string;
  lacertaFileSize?: number;
  lacertaFileType?: string;
  lacertaFileKey?: string;
  lacertaWrappedKey?: string;
  lacertaFileDecryptionKey?: string;

  // New Custom Properties
  emoji?: string;
  calloutType?: "info" | "warning" | "success" | "error";
  annotationPointer?: { x: number; y: number };
  lockPosition?: boolean;
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

const CURSOR_COLORS = [
  { text: "text-emerald-400", fill: "fill-emerald-400", bg: "bg-emerald-600 border-emerald-500 text-emerald-foreground" },
  { text: "text-blue-400", fill: "fill-blue-400", bg: "bg-blue-600 border-blue-500 text-blue-foreground" },
  { text: "text-rose-400", fill: "fill-rose-400", bg: "bg-rose-600 border-rose-500 text-rose-foreground" },
  { text: "text-amber-400", fill: "fill-amber-400", bg: "bg-amber-600 border-amber-500 text-amber-foreground" },
  { text: "text-purple-400", fill: "fill-purple-400", bg: "bg-purple-600 border-purple-500 text-purple-foreground" },
  { text: "text-teal-400", fill: "fill-teal-400", bg: "bg-teal-600 border-teal-500 text-teal-foreground" },
  { text: "text-pink-400", fill: "fill-pink-400", bg: "bg-pink-600 border-pink-500 text-pink-foreground" },
  { text: "text-indigo-400", fill: "fill-indigo-400", bg: "bg-indigo-600 border-indigo-500 text-indigo-foreground" },
];

const getCollaboratorColor = (identifier: string) => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};

function CollaboratorProfileTrigger({
  userId,
  username,
  accessToken,
  isMe = false,
}: {
  userId: string;
  username: string;
  accessToken: string;
  isMe?: boolean;
}) {
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMouseEnter = async () => {
    if (profile || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${username}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          id: data.id,
          username: data.username,
          email: data.email || `${data.username}@runerra.org`,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          bio: data.profileSettings?.bio || "",
        });
      }
    } catch (err) {
      console.error("Failed to load collaborator profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {profile ? (
        <UserProfileCard user={profile}>
          <button className="w-full text-left flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground">
            <span className="truncate flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", isMe ? "bg-primary" : "bg-success")} />
              {profile.displayName || profile.username} {isMe && "(You)"}
            </span>
          </button>
        </UserProfileCard>
      ) : (
        <button
          disabled={loading}
          className="w-full text-left flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground"
        >
          <span className="truncate flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMe ? "bg-primary" : "bg-success")} />
            {username} {isMe && "(You)"} {loading && "..."}
          </span>
        </button>
      )}
    </div>
  );
}

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
  const { data: session } = useSession();
  // Canvas viewport states
  const [pan, setPan] = useState<Point>({ x: 100, y: 100 });
  const [zoom, setZoom] = useState<number>(1);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Node manipulation states
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeId = selectedNodeIds[selectedNodeIds.length - 1] || null;
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Lasso rectangle selection state
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Dragging group child nodes binding state
  const [dragGroupChildren, setDragGroupChildren] = useState<
    { id: string; initialX: number; initialY: number }[]
  >([]);

  // Dragging multi-selected nodes state
  const [dragMultiNodes, setDragMultiNodes] = useState<
    { id: string; initialX: number; initialY: number }[]
  >([]);

  // Dragging node
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [dragNodeInitialPos, setDragNodeInitialPos] = useState<Point>({
    x: 0,
    y: 0,
  });

  // Dragging Annotation Pointer tip
  const [dragAnnotationPointerNodeId, setDragAnnotationPointerNodeId] =
    useState<string | null>(null);

  // Resizing node
  const [resizeNodeId, setResizeNodeId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<Point>({ x: 0, y: 0 });
  const [resizeInitialSize, setResizeInitialSize] = useState<{
    w: number;
    h: number;
  }>({ w: 0, h: 0 });

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

  // Online Collaborators Dropdown States
  const [showOnlineDropdown, setShowOnlineDropdown] = useState<boolean>(false);
  const onlineDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        onlineDropdownRef.current &&
        !onlineDropdownRef.current.contains(e.target as Node)
      ) {
        setShowOnlineDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Image insertion dialog state
  const [imagePrompt, setImagePrompt] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // New features dialog states
  const { privateKey } = useRRCrypto();
  const [videoPrompt, setVideoPrompt] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [gifPrompt, setGifPrompt] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [filePrompt, setFilePrompt] = useState<{
    x: number;
    y: number;
    embedType: "file" | "pdf";
  } | null>(null);
  const [pendingFileShare, setPendingFileShare] = useState<{
    type: "image" | "file" | "pdf";
    fileObj: any;
    x: number;
    y: number;
  } | null>(null);

  // Fetch and decrypt Lacerta files for embedding selection
  const { data: rawFiles, isLoading: rawFilesLoading } = useSWR<any[]>(
    accessToken && isOpen
      ? [`${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/list`, accessToken]
      : null,
    fetcher,
  );
  const [decryptedLacertaFiles, setDecryptedLacertaFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!rawFiles || !privateKey) {
      setDecryptedLacertaFiles([]);
      return;
    }
    const decryptAll = async () => {
      const list: any[] = [];
      const currentUserId = session?.user?.id;
      for (const f of rawFiles) {
        try {
          if (f.isTrash || f.isFolder) continue;

          const isOwner = f.userId === currentUserId;
          const shareRecord = f.shares?.find((s: any) => s.userId === currentUserId);
          const wrappedKeyToUse = isOwner ? f.wrappedKey : (shareRecord ? shareRecord.wrappedKey : null);

          if (!wrappedKeyToUse) continue;

          // Decrypt symmetric file key using recipient's private key
          const rawKeyStr = await unwrapFileKeyForUser(
            wrappedKeyToUse,
            privateKey,
          );
          const fileKey = await importRawKey(rawKeyStr);

          // Decrypt name and mimetype
          let decryptedName = f.name;
          try {
            decryptedName = await decryptMetadataString(f.name, fileKey);
          } catch {}

          let decryptedType = f.type;
          try {
            decryptedType = await decryptMetadataString(f.type, fileKey);
          } catch {}

          list.push({
            ...f,
            name: decryptedName,
            type: decryptedType,
            decryptedKey: fileKey,
            rawFileKey: rawKeyStr,
          });
        } catch (err) {
          console.error(
            "Failed to decrypt file metadata inside CanvasEditor:",
            f.id,
            err,
          );
        }
      }
      setDecryptedLacertaFiles(list);
    };
    decryptAll();
  }, [rawFiles, privateKey, session?.user?.id]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirtyState] = useState<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const setIsDirty = (val: boolean) => {
    setIsDirtyState(val);
    isDirtyRef.current = val;
  };

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
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
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
        if (!isEditing) {
          if (selectedNodeIds.length > 0) {
            setNodes((prev) =>
              prev.filter((n) => !selectedNodeIds.includes(n.id)),
            );
            setEdges((prev) =>
              prev.filter(
                (edge) =>
                  !selectedNodeIds.includes(edge.fromNode) &&
                  !selectedNodeIds.includes(edge.toNode),
              ),
            );
            setSelectedNodeIds([]);
            setIsDirty(true);
          } else if (selectedEdgeId) {
            setEdges((prev) =>
              prev.filter((edge) => edge.id !== selectedEdgeId),
            );
            setSelectedEdgeId(null);
            setIsDirty(true);
          }
        }
      } else if (
        e.shiftKey &&
        selectedNodeId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
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
              if (e.key === "ArrowLeft")
                nextW = Math.max(220, nextW - resizeAmount);
              if (e.key === "ArrowDown") nextH += resizeAmount;
              if (e.key === "ArrowUp")
                nextH = Math.max(160, nextH - resizeAmount);
              return { ...n, width: nextW, height: nextH };
            }),
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

  const saveCanvasSilently = async () => {
    console.log(
      "saveCanvasSilently starting... file:",
      file?.id,
      "isSaving:",
      isSaving,
    );
    if (!file?.decryptedKey || isSaving) {
      console.warn(
        "saveCanvasSilently aborted: no decrypted key or already saving",
      );
      return;
    }

    try {
      const canvasState = { nodes, edges };
      console.log(
        "saveCanvasSilently: encrypting canvas state...",
        canvasState,
      );
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

      const headers: any = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      console.log("saveCanvasSilently: submitting PUT to server...");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`,
        {
          method: "PUT",
          headers,
          body: formData,
        },
      );

      console.log("saveCanvasSilently: response status:", res.status);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      console.log("saveCanvasSilently successful! Mutating parent...");
      setIsDirty(false);
      isDirtyRef.current = false;
      onSaveSuccess();
    } catch (err) {
      console.error("Silent autosave failed:", err);
    }
  };

  // Auto-save on card selection change (focus change / deselect)
  const prevSelectedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    console.log(
      "Autosave effect run - selected:",
      selectedNodeId,
      "prev:",
      prevSelectedNodeIdRef.current,
      "isDirty:",
      isDirtyRef.current,
    );
    if (
      prevSelectedNodeIdRef.current !== null &&
      selectedNodeId !== prevSelectedNodeIdRef.current
    ) {
      if (isDirtyRef.current) {
        console.log(
          `Focus change autosave triggered! prev: ${prevSelectedNodeIdRef.current}, current: ${selectedNodeId}`,
        );
        saveCanvasSilently();
      }
    }
    prevSelectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

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
            : n,
        ),
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
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      if (!isSpacePressed && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const localX = (e.clientX - rect.left - pan.x) / zoom;
        const localY = (e.clientY - rect.top - pan.y) / zoom;
        setSelectionBox({
          startX: localX,
          startY: localY,
          currentX: localX,
          currentY: localY,
        });
        return;
      }
    }

    // Start panning if space pressed OR middle click OR empty canvas background clicked
    if (isSpacePressed || e.button === 1 || isBackgroundClicked) {
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

      // Update lasso selection box
      if (selectionBox) {
        const nextBox = { ...selectionBox, currentX: localX, currentY: localY };
        setSelectionBox(nextBox);

        const x1 = Math.min(nextBox.startX, localX);
        const x2 = Math.max(nextBox.startX, localX);
        const y1 = Math.min(nextBox.startY, localY);
        const y2 = Math.max(nextBox.startY, localY);

        const inside = nodes
          .filter((n) => {
            const nX1 = n.x;
            const nX2 = n.x + n.width;
            const nY1 = n.y;
            const nY2 = n.y + n.height;
            return nX1 < x2 && nX2 > x1 && nY1 < y2 && nY2 > y1;
          })
          .map((n) => n.id);
        setSelectedNodeIds(inside);
        return;
      }

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
          prev.map((n) => {
            // 1. Multi-node dragging
            const dragMulti = dragMultiNodes.find((c) => c.id === n.id);
            if (dragMulti) {
              return {
                ...n,
                x: dragMulti.initialX + dx,
                y: dragMulti.initialY + dy,
              };
            }
            // 2. Single node fallback
            if (n.id === dragNodeId) {
              return {
                ...n,
                x: dragNodeInitialPos.x + dx,
                y: dragNodeInitialPos.y + dy,
              };
            }
            // 3. Child of dragged group
            const dragChild = dragGroupChildren.find((c) => c.id === n.id);
            if (dragChild) {
              return {
                ...n,
                x: dragChild.initialX + dx,
                y: dragChild.initialY + dy,
              };
            }
            return n;
          }),
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

      // Update annotation pointer dragging
      if (dragAnnotationPointerNodeId) {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragAnnotationPointerNodeId
              ? {
                  ...n,
                  annotationPointer: {
                    x: localX - n.x,
                    y: localY - n.y,
                  },
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
    const wasDraggingOrResizing =
      dragNodeId !== null ||
      resizeNodeId !== null ||
      dragAnnotationPointerNodeId !== null;
    setIsPanning(false);
    setDragNodeId(null);
    setResizeNodeId(null);
    setDragAnnotationPointerNodeId(null);
    setConnecting(null);
    setSelectionBox(null);
    setDragGroupChildren([]);
    setDragMultiNodes([]);

    if (wasDraggingOrResizing && isDirtyRef.current) {
      console.log("Drag/resize/pointer end autosave triggered!");
      saveCanvasSilently();
    }
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
    setSelectedNodeIds([newNode.id]);
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
    extraProps?: Partial<CanvasNode>,
  ) => {
    let defaultWidth = 340;
    let defaultHeight = 250;

    if (type === "text") {
      defaultWidth = cardStyle === "sticky" ? 240 : 300;
      defaultHeight =
        cardStyle === "sticky" ? 240 : cardStyle === "header" ? 80 : 220;
    } else if (type === "image") {
      defaultWidth = 320;
      defaultHeight = 240;
    } else if (type === "table") {
      defaultWidth = 380;
      defaultHeight = 220;
    } else if (type === "mermaid" || type === "uml") {
      defaultWidth = 380;
      defaultHeight = 280;
    } else if (type === "video") {
      defaultWidth = 400;
      defaultHeight = 280;
    } else if (type === "gif") {
      defaultWidth = 260;
      defaultHeight = 240;
    } else if (type === "file") {
      defaultWidth = 280;
      defaultHeight = 120;
    } else if (type === "emoji") {
      defaultWidth = 160;
      defaultHeight = 160;
    } else if (type === "pdf") {
      defaultWidth = 440;
      defaultHeight = 560;
    } else if (type === "callout") {
      defaultWidth = 380;
      defaultHeight = 150;
    } else if (type === "annotation") {
      defaultWidth = 260;
      defaultHeight = 160;
    } else if (type === "group") {
      defaultWidth = 500;
      defaultHeight = 360;
    }

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
      ...extraProps,
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
    } else if (type === "mermaid") {
      newNode.mermaidCode =
        initialText ||
        "graph TD\n    A[Start] --> B(Process)\n    B --> C{Decision}\n    C -- Yes --> D[Result 1]\n    C -- No --> E[Result 2]";
    } else if (type === "uml") {
      newNode.mermaidCode =
        initialText ||
        "classDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog";
    } else if (type === "emoji") {
      newNode.emoji = "🎯";
    } else if (type === "callout") {
      newNode.calloutType = "info";
      newNode.text = "<p>Callout alert...</p>";
    } else if (type === "annotation") {
      newNode.annotationPointer = { x: -60, y: -60 };
      newNode.text = "<p>Pointer annotation...</p>";
      newNode.color = "blue";
    } else if (type === "group") {
      newNode.text = "Group";
      newNode.color = "slate";
    }

    setNodes((prev) => {
      // Groups go to front of list so they render first (behind other cards)
      if (type === "group") {
        return [newNode, ...prev];
      }
      return [...prev, newNode];
    });
    setSelectedNodeIds([newNode.id]);
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
    if (selectedNodeIds.includes(id)) setSelectedNodeIds([]);
    setIsDirty(true);
  };

  const startDragNode = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (isSpacePressed) return;
    if (node.lockPosition) return; // locked cards cannot be dragged

    const isShift = e.shiftKey;
    if (isShift) {
      // Toggle node in selection
      setSelectedNodeIds((prev) =>
        prev.includes(node.id)
          ? prev.filter((id) => id !== node.id)
          : [...prev, node.id],
      );
      return;
    }

    // If this node is part of multi-selection, drag all selected nodes together
    const isInMulti =
      selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id);
    if (isInMulti) {
      const multiInitial = nodes
        .filter((n) => selectedNodeIds.includes(n.id) && !n.lockPosition)
        .map((n) => ({ id: n.id, initialX: n.x, initialY: n.y }));
      setDragMultiNodes(multiInitial);
      setDragNodeId(node.id);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragNodeInitialPos({ x: node.x, y: node.y });
      return;
    }

    // When dragging a group frame, bind all contained child nodes
    if (node.type === "group") {
      const groupChildren = nodes
        .filter(
          (n) =>
            n.id !== node.id &&
            !n.lockPosition &&
            n.x >= node.x &&
            n.x + n.width <= node.x + node.width &&
            n.y >= node.y &&
            n.y + n.height <= node.y + node.height,
        )
        .map((n) => ({ id: n.id, initialX: n.x, initialY: n.y }));
      setDragGroupChildren(groupChildren);
    }

    setSelectedNodeIds([node.id]);
    setSelectedEdgeId(null);
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

  const startDragAnnotationPointer = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDragAnnotationPointerNodeId(nodeId);
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
  // Layering, Lock, and Align Helpers
  // -----------------------------------------------------------------------------
  const bringToFront = (id: string) => {
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [node] = updated.splice(idx, 1);
      updated.push(node);
      return updated;
    });
    setIsDirty(true);
  };

  const sendToBack = (id: string) => {
    setNodes((prev) => {
      const idx = prev.findIndex((n) => n.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const [node] = updated.splice(idx, 1);
      // Insert after all group nodes so it stays above group frames
      const firstNonGroup = updated.findIndex((n) => n.type !== "group");
      updated.splice(firstNonGroup === -1 ? 0 : firstNonGroup, 0, node);
      return updated;
    });
    setIsDirty(true);
  };

  const toggleLock = (id: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, lockPosition: !n.lockPosition } : n,
      ),
    );
    setIsDirty(true);
  };

  const alignNodes = (
    direction: "left" | "right" | "top" | "bottom" | "center-h" | "center-v",
  ) => {
    if (selectedNodeIds.length < 2) return;
    const selected = nodes.filter(
      (n) => selectedNodeIds.includes(n.id) && !n.lockPosition,
    );
    if (selected.length < 2) return;

    let anchor: number;
    if (direction === "left") anchor = Math.min(...selected.map((n) => n.x));
    else if (direction === "right")
      anchor = Math.max(...selected.map((n) => n.x + n.width));
    else if (direction === "top")
      anchor = Math.min(...selected.map((n) => n.y));
    else if (direction === "bottom")
      anchor = Math.max(...selected.map((n) => n.y + n.height));
    else if (direction === "center-h")
      anchor =
        (Math.min(...selected.map((n) => n.x)) +
          Math.max(...selected.map((n) => n.x + n.width))) /
        2;
    else
      anchor =
        (Math.min(...selected.map((n) => n.y)) +
          Math.max(...selected.map((n) => n.y + n.height))) /
        2;

    setNodes((prev) =>
      prev.map((n) => {
        if (!selectedNodeIds.includes(n.id) || n.lockPosition) return n;
        switch (direction) {
          case "left":
            return { ...n, x: anchor };
          case "right":
            return { ...n, x: anchor - n.width };
          case "top":
            return { ...n, y: anchor };
          case "bottom":
            return { ...n, y: anchor - n.height };
          case "center-h":
            return { ...n, x: anchor - n.width / 2 };
          case "center-v":
            return { ...n, y: anchor - n.height / 2 };
          default:
            return n;
        }
      }),
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
    const isSelected = selectedEdgeId === edge.id;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return (
      <g key={edge.id} className="group/edge">
        {/* Selection highlight halo */}
        {isSelected && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={6}
            strokeLinecap="round"
            opacity={0.25}
            className="pointer-events-none"
          />
        )}
        {/* Wide invisible hit area */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={15}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEdgeId(isSelected ? null : edge.id);
            setSelectedNodeIds([]);
          }}
        />
        {/* Rendered line */}
        <path
          d={pathD}
          fill="none"
          strokeWidth={isSelected ? 2.5 : 2}
          strokeLinecap="round"
          className={
            isSelected
              ? "stroke-primary pointer-events-none"
              : "stroke-indigo-400 dark:stroke-indigo-600 transition-colors pointer-events-none group-hover/edge:stroke-primary/80"
          }
          markerEnd="url(#arrow)"
        />
        {/* Delete button at midpoint – visible when selected */}
        {isSelected && (
          <foreignObject x={midX - 12} y={midY - 12} width={24} height={24}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEdges((prev) => prev.filter((ed) => ed.id !== edge.id));
                setSelectedEdgeId(null);
                setIsDirty(true);
              }}
              className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-xs font-bold leading-none"
            >
              ×
            </button>
          </foreignObject>
        )}
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
            <div className="flex items-center gap-4 relative" ref={onlineDropdownRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOnlineDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted/80 px-2.5 py-1 rounded-full border border-border text-[10px] text-muted-foreground transition-colors cursor-pointer select-none"
                >
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {collaborators.length + 1} online
                  </span>
                  <div className="flex items-center -space-x-1.5 ml-1">
                    <div className="h-4.5 w-4.5 rounded-full bg-primary border border-background flex items-center justify-center font-bold text-[8px] text-primary-foreground">
                      You
                    </div>
                    {collaborators.map((c) => {
                      const color = getCollaboratorColor(c.userId || c.socketId || c.username);
                      return (
                        <div
                          key={c.socketId}
                          className={cn("h-4.5 w-4.5 rounded-full border border-background flex items-center justify-center font-bold text-[8px] text-white uppercase", color.bg.split(' ')[0])}
                          title={c.username}
                        >
                          {c.username.substring(0, 1)}
                        </div>
                      );
                    })}
                  </div>
                </button>

                {showOnlineDropdown && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-2 z-50 flex flex-col gap-1">
                    <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider px-2.5 py-1.5 border-b border-border/30">
                      Collaborators
                    </div>

                    {/* The current user */}
                    <div className="px-1.5 py-1">
                      {session?.user?.username ? (
                        <CollaboratorProfileTrigger
                          userId={session.user.id}
                          username={session.user.username}
                          accessToken={accessToken}
                          isMe={true}
                        />
                      ) : (
                        <div className="w-full flex items-center justify-between p-1.5 text-xs text-muted-foreground font-semibold">
                          <span className="truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {guestName || "Guest"} (You)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            Guest
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Online Collaborators */}
                    {collaborators.map((c) => {
                      const isGuest = !c.userId;
                      return (
                        <div key={c.socketId} className="px-1.5 py-0.5">
                          {isGuest ? (
                            <div className="w-full flex items-center justify-between p-1.5 text-xs text-muted-foreground font-semibold">
                              <span className="truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                {c.username}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                Guest
                              </span>
                            </div>
                          ) : (
                            <CollaboratorProfileTrigger
                              userId={c.userId!}
                              username={c.username}
                              accessToken={accessToken}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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

          {/* Align Tools Toolbar – visible when 2+ nodes are selected */}
          {selectedNodeIds.length > 1 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl px-2 py-1.5 pointer-events-auto">
              <span className="text-[10px] text-muted-foreground font-semibold px-1 pr-2 border-r border-border">
                {selectedNodeIds.length} selected
              </span>
              {(
                [
                  { dir: "left" as const, label: "⇤", title: "Align Left" },
                  {
                    dir: "center-h" as const,
                    label: "↔",
                    title: "Center Horizontally",
                  },
                  { dir: "right" as const, label: "⇥", title: "Align Right" },
                  { dir: "top" as const, label: "⇡", title: "Align Top" },
                  {
                    dir: "center-v" as const,
                    label: "↕",
                    title: "Center Vertically",
                  },
                  { dir: "bottom" as const, label: "⇣", title: "Align Bottom" },
                ] as const
              ).map(({ dir, label, title }) => (
                <button
                  key={dir}
                  title={title}
                  onClick={() => alignNodes(dir)}
                  className="w-7 h-7 rounded-lg hover:bg-accent text-foreground text-sm font-semibold flex items-center justify-center transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

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

                  {/* Annotation pointers */}
                  {nodes
                    .filter((n) => n.type === "annotation")
                    .map((n) => {
                      const pointer = n.annotationPointer || { x: -60, y: -60 };
                      const targetX = n.x + pointer.x;
                      const targetY = n.y + pointer.y;
                      const sourceX = n.x + n.width / 2;
                      const sourceY = n.y + n.height / 2;

                      return (
                        <g key={`annotation-line-${n.id}`}>
                          {/* Outer glow line */}
                          <line
                            x1={sourceX}
                            y1={sourceY}
                            x2={targetX}
                            y2={targetY}
                            stroke="var(--primary)"
                            strokeWidth={3}
                            strokeLinecap="round"
                            opacity={0.4}
                          />
                          {/* Inner line with marker */}
                          <line
                            x1={sourceX}
                            y1={sourceY}
                            x2={targetX}
                            y2={targetY}
                            stroke="var(--primary)"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            markerEnd="url(#arrow)"
                          />
                        </g>
                      );
                    })}

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

                  {/* Lasso selection box overlay */}
                  {selectionBox && (
                    <rect
                      x={Math.min(selectionBox.startX, selectionBox.currentX)}
                      y={Math.min(selectionBox.startY, selectionBox.currentY)}
                      width={Math.abs(
                        selectionBox.currentX - selectionBox.startX,
                      )}
                      height={Math.abs(
                        selectionBox.currentY - selectionBox.startY,
                      )}
                      fill="var(--primary)"
                      fillOpacity={0.05}
                      stroke="var(--primary)"
                      strokeWidth={1.5 / zoom}
                      strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                      rx={4 / zoom}
                      className="pointer-events-none"
                    />
                  )}
                </svg>

                {/* Render Nodes (groups first so they render behind other cards) */}
                {[...nodes]
                  .sort((a, b) => {
                    if (a.type === "group" && b.type !== "group") return -1;
                    if (a.type !== "group" && b.type === "group") return 1;
                    return 0;
                  })
                  .map((node) => {
                    const preset =
                      COLOR_PRESETS.find((p) => p.name === node.color) ||
                      COLOR_PRESETS[0];

                    return (
                      <React.Fragment key={node.id}>
                        {/* Draggable Pointer Target Handle for Annotations */}
                        {node.type === "annotation" &&
                          selectedNodeId === node.id && (
                            <div
                              onMouseDown={(e) =>
                                startDragAnnotationPointer(e, node.id)
                              }
                              className="absolute w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg cursor-crosshair z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform pointer-events-auto"
                              style={{
                                left:
                                  node.x +
                                  (node.annotationPointer?.x ?? -60) -
                                  10,
                                top:
                                  node.y +
                                  (node.annotationPointer?.y ?? -60) -
                                  10,
                              }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          )}

                        <div
                          data-card-id={node.id}
                          onMouseDown={(e) => startDragNode(e, node)}
                          className={(() => {
                            const isSelected = selectedNodeIds.includes(
                              node.id,
                            );
                            let cls = `absolute flex flex-col overflow-hidden pointer-events-auto group transition-all `;
                            if (node.type === "group") {
                              cls += cn(
                                "rounded-2xl border-2 border-dashed",
                                isSelected
                                  ? "border-primary/60 bg-primary/3"
                                  : `${preset.border} bg-transparent hover:bg-primary/2`,
                              );
                            } else if (node.cardStyle === "header") {
                              cls += cn(
                                "border-0 bg-transparent shadow-none",
                                isSelected ? "ring-1 ring-primary/50" : "",
                              );
                            } else if (node.cardStyle === "sticky") {
                              cls += cn(
                                "rounded-lg border bg-warning/8 text-foreground shadow-xl transition-all",
                                isSelected
                                  ? "border-t-[6px] border-t-warning border-warning/40 ring-2 ring-primary shadow-lg"
                                  : "border-transparent hover:border-t-[6px] hover:border-t-warning hover:border-warning/40 hover:shadow-md",
                              );
                            } else {
                              // Standard card styling
                              cls += cn(
                                "rounded-2xl border bg-card text-card-foreground shadow-xl transition-all",
                                preset.bg,
                                isSelected
                                  ? cn(
                                      "ring-2 ring-primary shadow-lg",
                                      preset.border,
                                    )
                                  : "border-transparent hover:border-border hover:shadow-md",
                              );
                            }
                            if (node.lockPosition) cls += " cursor-not-allowed";
                            return cls;
                          })()}
                          style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                            zIndex: node.type === "group" ? 0 : undefined,
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
                                  if (!e.ctrlKey && !e.metaKey)
                                    e.stopPropagation();
                                }}
                              >
                                <TiptapNode
                                  content={node.text || ""}
                                  onChange={(html) =>
                                    handleTextChange(node.id, html)
                                  }
                                />
                              </div>
                            ) : (
                              <RrCanvasCardContent
                                node={node}
                                selected={selectedNodeId === node.id}
                                accessToken={accessToken}
                                zoom={zoom}
                                onNodeUpdate={(updates) => {
                                  setNodes((prev) =>
                                    prev.map((n) =>
                                      n.id === node.id
                                        ? { ...n, ...updates }
                                        : n,
                                    ),
                                  );
                                  setIsDirty(true);
                                }}
                              />
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
                        {node.type === "graph" &&
                          selectedNodeId === node.id && (
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
                                  {(["bar", "line", "pie"] as const).map(
                                    (t) => (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                          setNodes((prev) =>
                                            prev.map((n) =>
                                              n.id === node.id
                                                ? { ...n, graphType: t }
                                                : n,
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
                                    ),
                                  )}
                                </div>
                              </div>

                              {/* Editor list */}
                              <div className="flex-1 overflow-y-auto pr-1">
                                <div className="flex flex-col gap-1.5">
                                  {(node.graphData || []).map((row, idx) => (
                                    <div
                                      key={idx}
                                      className="flex gap-1.5 items-center"
                                    >
                                      <input
                                        type="text"
                                        value={row.name}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setNodes((prev) =>
                                            prev.map((n) => {
                                              if (n.id !== node.id) return n;
                                              const nextData = [
                                                ...(n.graphData || []),
                                              ];
                                              nextData[idx] = {
                                                ...nextData[idx],
                                                name: val,
                                              };
                                              return {
                                                ...n,
                                                graphData: nextData,
                                              };
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
                                              const nextData = [
                                                ...(n.graphData || []),
                                              ];
                                              nextData[idx] = {
                                                ...nextData[idx],
                                                value: val,
                                              };
                                              return {
                                                ...n,
                                                graphData: nextData,
                                              };
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
                                                graphData: (
                                                  n.graphData || []
                                                ).filter((_, i) => i !== idx),
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

                        {/* Mermaid / UML Settings Floating Panel */}
                        {(node.type === "mermaid" || node.type === "uml") &&
                          selectedNodeId === node.id && (
                            <div
                              className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all w-[320px]"
                              style={{
                                left: node.x + node.width + 12,
                                top: node.y,
                                height: node.height,
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between border-b border-border pb-2 mb-2 shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  {node.type === "mermaid"
                                    ? "Mermaid Diagram Code"
                                    : "UML Diagram Code"}
                                </span>
                              </div>
                              <div className="flex-1 flex flex-col min-h-0">
                                <textarea
                                  value={node.mermaidCode || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === node.id
                                          ? { ...n, mermaidCode: val }
                                          : n,
                                      ),
                                    );
                                    setIsDirty(true);
                                  }}
                                  className="flex-1 w-full bg-background border border-border rounded-lg p-3 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-primary resize-none leading-relaxed"
                                  placeholder={
                                    node.type === "mermaid"
                                      ? "graph TD..."
                                      : "classDiagram..."
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Tab") {
                                      e.preventDefault();
                                      const start =
                                        e.currentTarget.selectionStart;
                                      const end = e.currentTarget.selectionEnd;
                                      const val = e.currentTarget.value;
                                      const updated =
                                        val.substring(0, start) +
                                        "    " +
                                        val.substring(end);
                                      setNodes((prev) =>
                                        prev.map((n) =>
                                          n.id === node.id
                                            ? { ...n, mermaidCode: updated }
                                            : n,
                                        ),
                                      );
                                      setTimeout(() => {
                                        if (e.currentTarget) {
                                          e.currentTarget.selectionStart =
                                            e.currentTarget.selectionEnd =
                                              start + 4;
                                        }
                                      }, 0);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}
                      </React.Fragment>
                    );
                  })}

                {/* Collaborator Cursor Pointers */}
                {collaborators.map((c) => {
                  if (!c.cursor) return null;
                  const color = getCollaboratorColor(c.userId || c.socketId || c.username);
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
                        className={cn("w-4 h-4 fill-current drop-shadow-md", color.text)}
                      >
                        <path d="M0 0 L16 12 L9 13.5 L16 22 L13 23 L6.5 15 L0 20 Z" />
                      </svg>
                      <div className={cn("absolute top-4 left-3 px-2 py-0.5 border text-white text-[8px] font-bold rounded shadow whitespace-nowrap", color.bg)}>
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

          {/* Insertion and Warning Modals */}
          <RrCanvasImageInsertModal
            isOpen={imagePrompt !== null}
            onClose={() => setImagePrompt(null)}
            x={imagePrompt?.x ?? 0}
            y={imagePrompt?.y ?? 0}
            decryptedLacertaFiles={decryptedLacertaFiles}
            canvasFile={file}
            createNodeAtPos={createNodeAtPos}
            setPendingFileShare={setPendingFileShare}
          />

          <RrCanvasVideoInsertModal
            isOpen={videoPrompt !== null}
            onClose={() => setVideoPrompt(null)}
            x={videoPrompt?.x ?? 0}
            y={videoPrompt?.y ?? 0}
            createNodeAtPos={createNodeAtPos}
          />

          <RrCanvasGifInsertModal
            isOpen={gifPrompt !== null}
            onClose={() => setGifPrompt(null)}
            x={gifPrompt?.x ?? 0}
            y={gifPrompt?.y ?? 0}
            createNodeAtPos={createNodeAtPos}
          />

          <RrCanvasFileInsertModal
            isOpen={filePrompt !== null}
            onClose={() => setFilePrompt(null)}
            x={filePrompt?.x ?? 0}
            y={filePrompt?.y ?? 0}
            embedType={filePrompt?.embedType ?? "file"}
            decryptedLacertaFiles={decryptedLacertaFiles}
            canvasFile={file}
            createNodeAtPos={createNodeAtPos}
            setPendingFileShare={setPendingFileShare}
          />

          <RrCanvasPublicShareWarningModal
            isOpen={pendingFileShare !== null}
            onClose={() => setPendingFileShare(null)}
            pendingFileShare={pendingFileShare}
            accessToken={accessToken}
            createNodeAtPos={createNodeAtPos}
          />
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

            {/* Change Sticker option for Emoji nodes */}
            {nodes.find((n) => n.id === rightClickedNodeId)?.type ===
              "emoji" && (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                  <Smile className="h-3.5 w-3.5 mr-2 text-warning" />
                  Change Sticker
                </ContextMenuSubTrigger>
                <ContextMenuPortal>
                  <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                    {["🎯", "👍", "🔥", "❤️", "🚀", "💡", "⚠️", "🎉"].map(
                      (emoji) => (
                        <ContextMenuItem
                          key={emoji}
                          onClick={() => {
                            setNodes((prev) =>
                              prev.map((n) =>
                                n.id === rightClickedNodeId
                                  ? { ...n, emoji }
                                  : n,
                              ),
                            );
                            setIsDirty(true);
                          }}
                          className="focus:bg-accent focus:text-accent-foreground cursor-pointer flex items-center px-3 py-1.5 text-xs font-semibold"
                        >
                          <span className="text-base mr-2">{emoji}</span>
                          <span>Sticker</span>
                        </ContextMenuItem>
                      ),
                    )}
                  </ContextMenuSubContent>
                </ContextMenuPortal>
              </ContextMenuSub>
            )}

            {/* Change Callout style option for Callout nodes */}
            {nodes.find((n) => n.id === rightClickedNodeId)?.type ===
              "callout" && (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                  Callout Style
                </ContextMenuSubTrigger>
                <ContextMenuPortal>
                  <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                    {[
                      {
                        type: "info",
                        colorClass: "text-blue-500",
                        label: "Info",
                      },
                      {
                        type: "warning",
                        colorClass: "text-amber-500",
                        label: "Warning",
                      },
                      {
                        type: "success",
                        colorClass: "text-emerald-500",
                        label: "Success",
                      },
                      {
                        type: "error",
                        colorClass: "text-rose-500",
                        label: "Danger",
                      },
                    ].map((style) => (
                      <ContextMenuItem
                        key={style.type}
                        onClick={() => {
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === rightClickedNodeId
                                ? { ...n, calloutType: style.type as any }
                                : n,
                            ),
                          );
                          setIsDirty(true);
                        }}
                        className="focus:bg-accent focus:text-accent-foreground cursor-pointer flex items-center px-3 py-1.5 text-xs font-semibold"
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full mr-2 bg-current",
                            style.colorClass,
                          )}
                        />
                        <span>{style.label}</span>
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuPortal>
              </ContextMenuSub>
            )}

            <ContextMenuSeparator className="bg-border" />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Maximize2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Arrange
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[160px]">
                  <ContextMenuItem
                    onClick={() => bringToFront(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    Bring to Front
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => sendToBack(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    Send to Back
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-border/30" />
                  <ContextMenuItem
                    onClick={() => toggleLock(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {nodes.find((n) => n.id === rightClickedNodeId)
                      ?.lockPosition
                      ? "🔓 Unlock Position"
                      : "🔒 Lock Position"}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            <ContextMenuItem
              onClick={() => handleNodeDelete(rightClickedNodeId!)}
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
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[190px] max-h-[420px] overflow-y-auto no-scrollbar">
                  {/* Category: Text & Notes */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    Text & Notes
                  </ContextMenuLabel>
                  <ContextMenuSeparator className="bg-border/30" />
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <StickyNote className="h-3.5 w-3.5 mr-2 text-amber-500" />
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Heading className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                    Floating Title
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "callout",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                    Callout Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "annotation",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-2 text-primary" />
                    Annotation Card
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Media & Embeds */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    Media & Embeds
                  </ContextMenuLabel>
                  <ContextMenuSeparator className="bg-border/30" />
                  <ContextMenuItem
                    onClick={() =>
                      setImagePrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    Image Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setGifPrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Film className="h-3.5 w-3.5 mr-2 text-pink-400" />
                    GIF Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setVideoPrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Video className="h-3.5 w-3.5 mr-2 text-rose-500" />
                    Video Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setFilePrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                        embedType: "pdf",
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-2 text-purple-400" />
                    PDF Document Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setFilePrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                        embedType: "file",
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                    Lacerta Vault File
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Diagrams & Stickers */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    Diagrams & Stickers
                  </ContextMenuLabel>
                  <ContextMenuSeparator className="bg-border/30" />
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "drawing",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Paintbrush className="h-3.5 w-3.5 mr-2 text-success" />
                    Whiteboard Sketchpad
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "mermaid",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2 text-pink-500" />
                    Mermaid Diagram
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "uml",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Network className="h-3.5 w-3.5 mr-2 text-purple-500" />
                    UML Card
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "emoji",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Smile className="h-3.5 w-3.5 mr-2 text-amber-400" />
                    Emoji Sticker
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "group",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Users className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                    Group Frame
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Data & Analytics */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    Data & Analytics
                  </ContextMenuLabel>
                  <ContextMenuSeparator className="bg-border/30" />
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "text",
                        rightClickPosition.x,
                        rightClickPosition.y,
                        "<pre><code>// Write your code here...\nconsole.log('Hello World!');</code></pre>",
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
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
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
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
