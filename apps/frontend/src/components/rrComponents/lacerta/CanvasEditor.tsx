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
  Video,
  Film,
  ExternalLink,
  Download,
  Check,
  ChevronRight,
  Grid3X3,
  Lock,
  Calculator,
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
  encrypt,
  decrypt,
  unwrapKey,
  exportRawKey,
} from "@runa/crypto/browser";
import TiptapNode from "./TiptapNode";
import RrCanvasCardContent from "./canvas-cards/rrCanvasCardContent";
import RrCanvasImageInsertModal from "./rrCanvasImageInsertModal";
import RrCanvasVideoInsertModal from "./rrCanvasVideoInsertModal";
import RrCanvasGifInsertModal from "./rrCanvasGifInsertModal";
import RrCanvasFileInsertModal from "./rrCanvasFileInsertModal";
import RrCanvasPublicShareWarningModal from "./rrCanvasPublicShareWarningModal";
import RrCanvasRrImageInsertModal from "./rrCanvasRrImageInsertModal";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { useSession } from "next-auth/react";
import UserProfileCard, { UserProfileInfo } from "./UserProfileCard";
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
import { useTranslation } from "react-i18next";

// Modular Imports
import {
  CanvasNodeType,
  Point,
  Stroke,
  CanvasNode,
  CanvasEdge,
  Collaborator,
  CanvasFileItem,
  CanvasEditorProps,
  COLOR_PRESETS,
  CURSOR_COLORS,
  getCollaboratorColor,
} from "./types";
import CollaboratorProfileTrigger from "./CollaboratorProfileTrigger";
import GraphSettingsPanel from "./panels/GraphSettingsPanel";
import MermaidSettingsPanel from "./panels/MermaidSettingsPanel";
import ScientificCalcSettingsPanel from "./panels/ScientificCalcSettingsPanel";

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
  const { t } = useTranslation();
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
    side: CanvasEdge["fromSide"];
  } | null>(null);
  const [connectingCursor, setConnectingCursor] = useState<Point>({
    x: 0,
    y: 0,
  });

  // Collaboration States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [lockedElements, setLockedElements] = useState<
    Record<string, { username: string; senderId: string }>
  >({});
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
  const [rightClickedEdgeId, setRightClickedEdgeId] = useState<string | null>(
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
  const [rrImagePrompt, setRrImagePrompt] = useState<{
    x: number;
    y: number;
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
          const shareRecord = f.shares?.find(
            (s: any) => s.userId === currentUserId,
          );
          const wrappedKeyToUse = isOwner
            ? f.wrappedKey
            : shareRecord
              ? shareRecord.wrappedKey
              : null;

          if (!wrappedKeyToUse) continue;

          // Decrypt symmetric file key using recipient's private key
          const fileKey = await unwrapKey(wrappedKeyToUse, privateKey);
          const rawKeyStr = await exportRawKey(fileKey);

          // Decrypt name and mimetype
          let decryptedName = f.name;
          try {
            decryptedName = await decrypt(f.name, fileKey);
          } catch {}

          let decryptedType = f.type;
          try {
            decryptedType = await decrypt(f.type, fileKey);
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
        return await encrypt(payload, cryptoKey);
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
        const result = await decrypt(encryptedText, cryptoKey);
        return typeof result === "string" ? JSON.parse(result) : result;
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
        toast.info(
          t(
            "lacerta.canvasEditor.joinedCanvas",
            "{{username}} joined the canvas",
            { username: member.username },
          ),
        );
      });

      newSocket.on("user-left", (data: { socketId: string }) => {
        setCollaborators((prev) =>
          prev.filter((m) => m.socketId !== data.socketId),
        );
        // Also release locks held by this user
        setLockedElements((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            if (next[key].senderId === data.socketId) {
              delete next[key];
            }
          }
          return next;
        });
      });

      newSocket.on(
        "element-lock",
        (data: {
          nodeId: string;
          isLocked: boolean;
          username: string;
          senderId: string;
        }) => {
          setLockedElements((prev) => {
            const next = { ...prev };
            if (data.isLocked) {
              next[data.nodeId] = {
                username: data.username,
                senderId: data.senderId,
              };
              // Deselect if currently selected by this client
              setSelectedNodeIds((prevIds) =>
                prevIds.filter((id) => id !== data.nodeId),
              );
            } else {
              delete next[data.nodeId];
            }
            return next;
          });
        },
      );

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
      const encryptedBuffer = await encrypt(rawBuffer, file.decryptedKey);

      // Encrypt name and mimetype for metadata
      const encName = await encrypt(file.name, file.decryptedKey);
      const encType = await encrypt(
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

      if (!res.ok) {
        let errMsg = t("lacerta.canvasEditor.saveFailed", "Failed to save canvas.");
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      toast.success(
        t("lacerta.canvasEditor.saveSuccess", "Canvas saved successfully!"),
      );
      setIsDirty(false);
      onSaveSuccess();
      if (forceClose) {
        onClose();
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          t("lacerta.canvasEditor.saveFailed", "Failed to save canvas."),
      );
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
      const encryptedBuffer = await encrypt(rawBuffer, file.decryptedKey);

      // Encrypt name and mimetype for metadata
      const encName = await encrypt(file.name, file.decryptedKey);
      const encType = await encrypt(
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
        let errMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.message) {
            errMsg = errData.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      console.log("saveCanvasSilently successful! Mutating parent...");
      setIsDirty(false);
      isDirtyRef.current = false;
      onSaveSuccess();
    } catch (err) {
      console.error("Silent autosave failed:", err);
    }
  };

  // Auto-save and Socket lock emissions on card selection change (focus change / deselect)
  const prevSelectedNodeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (socket && file?.id && selectedNodeId) {
      socket.emit("element-lock", {
        fileId: file.id,
        nodeId: selectedNodeId,
        isLocked: true,
      });
    }

    return () => {
      if (socket && file?.id && selectedNodeId) {
        socket.emit("element-lock", {
          fileId: file.id,
          nodeId: selectedNodeId,
          isLocked: false,
        });
      }
    };
  }, [selectedNodeId, socket, file?.id]);

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

  // Helper to dynamically calculate floating panel positioning
  const getPanelStyle = (node: CanvasNode, panelWidth: number) => {
    if (!containerRef.current) {
      return {
        left: node.x + node.width + 12,
        top: node.y,
        height: node.height,
      };
    }

    const rect = containerRef.current.getBoundingClientRect();
    const viewportMaxX = (rect.width - pan.x) / zoom;
    const viewportMinX = -pan.x / zoom;

    const defaultLeft = node.x + node.width + 12;
    const rightEdge = defaultLeft + panelWidth;

    // Check if right edge exceeds viewport
    if (rightEdge > viewportMaxX) {
      const leftOption = node.x - panelWidth - 12;
      // If left fits, place it on the left
      if (leftOption >= viewportMinX) {
        return {
          left: leftOption,
          top: node.y,
          height: node.height,
        };
      } else {
        // Otherwise place it below the card
        return {
          left: node.x,
          top: node.y + node.height + 12,
          height: Math.max(120, node.height), // ensure it's not squished
        };
      }
    }

    // Default right float
    return {
      left: defaultLeft,
      top: node.y,
      height: node.height,
    };
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
        prev.map((n) => {
          if (n.id === selectedNodeId) {
            const isRrImage = n.type === "rrImage";
            const minW = isRrImage ? 10 : 220;
            const minH = isRrImage ? 10 : 160;
            return {
              ...n,
              width: Math.max(minW, n.width + resizeDelta),
              height: Math.max(minH, n.height + resizeDelta),
            };
          }
          return n;
        }),
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
          prev.map((n) => {
            if (n.id === resizeNodeId) {
              const isRrImage = n.type === "rrImage";
              const minW = isRrImage ? 10 : 220;
              const minH = isRrImage ? 10 : 160;
              return {
                ...n,
                width: Math.max(minW, resizeInitialSize.w + dx),
                height: Math.max(minH, resizeInitialSize.h + dy),
              };
            }
            return n;
          }),
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

  // Touch handlers for panning and moving/resizing on touch screens
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const isBackgroundClicked =
      e.target === containerRef.current ||
      (e.target as HTMLElement).classList.contains("canvas-background");

    if (isBackgroundClicked && e.touches.length === 1) {
      setSelectedNodeIds([]);
      setSelectedEdgeId(null);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const touch = e.touches[0];
      if (!isSpacePressed && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const localX = (touch.clientX - rect.left - pan.x) / zoom;
        const localY = (touch.clientY - rect.top - pan.y) / zoom;
        setSelectionBox({
          startX: localX,
          startY: localY,
          currentX: localX,
          currentY: localY,
        });
        return;
      }
    }

    if (isSpacePressed || isBackgroundClicked) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (isPanning) {
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const localX = (touch.clientX - rect.left - pan.x) / zoom;
      const localY = (touch.clientY - rect.top - pan.y) / zoom;

      // Lasso selection box update
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

      // Dragging node position update
      if (dragNodeId) {
        if (e.cancelable) e.preventDefault();
        const dx = (touch.clientX - dragStart.x) / zoom;
        const dy = (touch.clientY - dragStart.y) / zoom;
        setNodes((prev) =>
          prev.map((n) => {
            const dragMulti = dragMultiNodes.find((c) => c.id === n.id);
            if (dragMulti) {
              return {
                ...n,
                x: dragMulti.initialX + dx,
                y: dragMulti.initialY + dy,
              };
            }
            if (n.id === dragNodeId) {
              return {
                ...n,
                x: dragNodeInitialPos.x + dx,
                y: dragNodeInitialPos.y + dy,
              };
            }
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

      // Resizing node dimensions update
      if (resizeNodeId) {
        if (e.cancelable) e.preventDefault();
        const dx = (touch.clientX - resizeStart.x) / zoom;
        const dy = (touch.clientY - resizeStart.y) / zoom;
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === resizeNodeId) {
              const isRrImage = n.type === "rrImage";
              const minW = isRrImage ? 10 : 220;
              const minH = isRrImage ? 10 : 160;
              return {
                ...n,
                width: Math.max(minW, resizeInitialSize.w + dx),
                height: Math.max(minH, resizeInitialSize.h + dy),
              };
            }
            return n;
          }),
        );
        setIsDirty(true);
      }

      // Annotation pointer dragging update
      if (dragAnnotationPointerNodeId) {
        if (e.cancelable) e.preventDefault();
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

      // Active connection connector guide line update
      if (connecting) {
        setConnectingCursor({ x: localX, y: localY });
      }
    }
  };

  const startDragNodeTouch = (e: React.TouchEvent, node: CanvasNode) => {
    if (lockedElements[node.id]) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const isShift = e.shiftKey;
    if (isShift) {
      setSelectedNodeIds((prev) =>
        prev.includes(node.id)
          ? prev.filter((id) => id !== node.id)
          : [...prev, node.id],
      );
      return;
    }

    const isInMulti =
      selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id);
    if (isInMulti) {
      const multiInitial = nodes
        .filter((n) => selectedNodeIds.includes(n.id) && !n.lockPosition)
        .map((n) => ({ id: n.id, initialX: n.x, initialY: n.y }));
      setDragMultiNodes(multiInitial);
      setDragNodeId(node.id);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragNodeInitialPos({ x: node.x, y: node.y });
      return;
    }

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
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragNodeInitialPos({ x: node.x, y: node.y });
  };

  const startResizeNodeTouch = (e: React.TouchEvent, node: CanvasNode) => {
    if (lockedElements[node.id]) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    setResizeNodeId(node.id);
    setResizeStart({ x: touch.clientX, y: touch.clientY });
    setResizeInitialSize({ w: node.width, h: node.height });
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
    } else if (type === "rrImage") {
      defaultWidth = 320;
      defaultHeight = 400;
    } else if (type === "callout") {
      defaultWidth = 380;
      defaultHeight = 150;
    } else if (type === "annotation") {
      defaultWidth = 260;
      defaultHeight = 160;
    } else if (type === "group") {
      defaultWidth = 500;
      defaultHeight = 360;
    } else if (type === "scientific-calc") {
      defaultWidth = 360;
      defaultHeight = 480;
    } else if (type === "graphing-calc") {
      defaultWidth = 440;
      defaultHeight = 520;
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
      color: cardStyle === "sticky" ? "orange" : "slate",
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
      newNode.text = "<p>" + t("lacerta.canvasEditor.defaultCalloutText", "Callout alert...") + "</p>";
    } else if (type === "annotation") {
      newNode.annotationPointer = { x: -60, y: -60 };
      newNode.text = "<p>" + t("lacerta.canvasEditor.defaultAnnotationText", "Pointer annotation...") + "</p>";
      newNode.color = "blue";
    } else if (type === "group") {
      newNode.text = t("lacerta.canvasEditor.defaultGroupText", "Group");
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
    const edgeId = target.getAttribute("data-edge-id");
    if (cardEl) {
      const cardId = cardEl.getAttribute("data-card-id");
      setRightClickedNodeId(cardId);
      setRightClickedEdgeId(null);
    } else if (edgeId) {
      setRightClickedEdgeId(edgeId);
      setRightClickedNodeId(null);
    } else {
      setRightClickedNodeId(null);
      setRightClickedEdgeId(null);
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
    if (lockedElements[node.id]) return;
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
    if (lockedElements[node.id]) return;
    e.stopPropagation();
    e.preventDefault();
    setResizeNodeId(node.id);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setResizeInitialSize({ w: node.width, h: node.height });
  };

  const startDragAnnotationPointer = (e: React.MouseEvent, nodeId: string) => {
    if (lockedElements[nodeId]) return;
    e.stopPropagation();
    e.preventDefault();
    setDragAnnotationPointerNodeId(nodeId);
  };

  const startConnecting = (
    e: React.MouseEvent,
    nodeId: string,
    side: CanvasEdge["fromSide"],
  ) => {
    if (lockedElements[nodeId]) return;
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
    toSide: CanvasEdge["toSide"],
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
    (nodeId: string, side: CanvasEdge["fromSide"]): Point => {
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
        case "top-left":
          return { x: node.x, y: node.y };
        case "top-right":
          return { x: node.x + node.width, y: node.y };
        case "bottom-left":
          return { x: node.x, y: node.y + node.height };
        case "bottom-right":
          return { x: node.x + node.width, y: node.y + node.height };
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

    const isStraight = edge.lineStyle === "straight";

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
    else if (edge.fromSide === "top-left") {
      cp1x -= dx;
      cp1y -= dy;
    } else if (edge.fromSide === "top-right") {
      cp1x += dx;
      cp1y -= dy;
    } else if (edge.fromSide === "bottom-left") {
      cp1x -= dx;
      cp1y += dy;
    } else if (edge.fromSide === "bottom-right") {
      cp1x += dx;
      cp1y += dy;
    }

    if (edge.toSide === "right") cp2x += dx;
    else if (edge.toSide === "left") cp2x -= dx;
    else if (edge.toSide === "bottom") cp2y += dy;
    else if (edge.toSide === "top") cp2y -= dy;
    else if (edge.toSide === "top-left") {
      cp2x -= dx;
      cp2y -= dy;
    } else if (edge.toSide === "top-right") {
      cp2x += dx;
      cp2y -= dy;
    } else if (edge.toSide === "bottom-left") {
      cp2x -= dx;
      cp2y += dy;
    } else if (edge.toSide === "bottom-right") {
      cp2x += dx;
      cp2y += dy;
    }

    const pathD = isStraight
      ? `M ${start.x} ${start.y} L ${end.x} ${end.y}`
      : `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;

    const isSelected = selectedEdgeId === edge.id;

    // Midpoint calculations
    const midX = isStraight
      ? (start.x + end.x) / 2
      : 0.125 * start.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * end.x;
    const midY = isStraight
      ? (start.y + end.y) / 2
      : 0.125 * start.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * end.y;

    const strokeColor = edge.color || "var(--primary)";
    const strokeDash =
      edge.lineType === "dashed"
        ? "6,4"
        : edge.lineType === "dotted"
          ? "2,3"
          : edge.lineType === "dashed-dotted"
            ? "6,4,2,4"
            : undefined;

    const chosenArrow = edge.arrowType || "normal";
    const mEnd = `url(#${chosenArrow})`;

    return (
      <g key={edge.id} className="group/edge">
        {/* Selection highlight halo */}
        {isSelected && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={strokeDash}
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
          data-edge-id={edge.id}
          className="cursor-pointer pointer-events-auto"
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
          stroke={strokeColor}
          strokeWidth={isSelected ? 2.5 : 2}
          strokeLinecap="round"
          strokeDasharray={strokeDash}
          className={
            isSelected
              ? "pointer-events-none"
              : "transition-colors pointer-events-none"
          }
          style={{ color: strokeColor }}
          markerEnd={mEnd}
        />
        {/* Connection Label Pill */}
        {edge.label && (
          <g className="pointer-events-none select-none">
            {/* Background pill */}
            <rect
              x={midX - edge.label.length * 3.5 - 6}
              y={midY - 8}
              width={edge.label.length * 7 + 12}
              height={16}
              rx={8}
              fill="var(--popover)"
              stroke="var(--border)"
              strokeWidth={1}
              className="shadow-sm"
            />
            <text
              x={midX}
              y={midY + 3}
              textAnchor="middle"
              className="text-[9px] font-extrabold fill-current text-foreground"
            >
              {edge.label}
            </text>
          </g>
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
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground font-sans overflow-hidden select-none"
          data-block-sidebar-gesture="true"
        >
          {/* Top Banner Toolbar */}
          <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (
                    isDirty &&
                    !confirm(
                      t(
                        "lacerta.canvasEditor.unsavedChanges",
                        "You have unsaved changes. Exit anyway?",
                      ),
                    )
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
                    {t(
                      "lacerta.canvasEditor.spatialCanvas",
                      "E2EE Spatial Canvas",
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toolbar removed, insertion handled by right-click menu */}
            </div>

            {/* Action controls & Collaborators */}
            <div
              className="flex items-center gap-4 relative"
              ref={onlineDropdownRef}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowOnlineDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted/80 px-2.5 py-1 rounded-full border border-border text-[10px] text-muted-foreground transition-colors cursor-pointer select-none"
                >
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {collaborators.length + 1}{" "}
                    {t("lacerta.canvasEditor.online", "online")}
                  </span>
                  <div className="flex items-center -space-x-1.5 ml-1">
                    <div className="h-4.5 w-4.5 rounded-full bg-primary border border-background flex items-center justify-center font-bold text-[8px] text-primary-foreground">
                      {t("lacerta.canvasEditor.you", "You")}
                    </div>
                    {collaborators.map((c) => {
                      const color = getCollaboratorColor(
                        c.userId || c.socketId || c.username,
                      );
                      return (
                        <div
                          key={c.socketId}
                          className={cn(
                            "h-4.5 w-4.5 rounded-full border border-background flex items-center justify-center font-bold text-[8px] text-white uppercase",
                            color.bg.split(" ")[0],
                          )}
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
                      {t("lacerta.canvasEditor.collaborators", "Collaborators")}
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
                            {guestName ||
                              t("lacerta.canvasEditor.guest", "Guest")}{" "}
                            ({t("lacerta.canvasEditor.you", "You")})
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                            {t("lacerta.canvasEditor.guest", "Guest")}
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
                                {t("lacerta.canvasEditor.guest", "Guest")}
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
                    {t(
                      "lacerta.canvasEditor.unsavedChangesLabel",
                      "Unsaved Changes",
                    )}
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
                  {isSaving
                    ? t("lacerta.canvasEditor.saving", "Saving...")
                    : t("lacerta.canvasEditor.save", "Save")}
                </button>
              </div>
            </div>
          </div>

          {/* Align Tools Toolbar – visible when 2+ nodes are selected */}
          {selectedNodeIds.length > 1 && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-popover/95 backdrop-blur border border-border rounded-xl shadow-xl px-2 py-1.5 pointer-events-auto">
              <span className="text-[10px] text-muted-foreground font-semibold px-1 pr-2 border-r border-border">
                {selectedNodeIds.length}{" "}
                {t("lacerta.canvasEditor.selected", "selected")}
              </span>
              {(
                [
                  {
                    dir: "left" as const,
                    label: "⇥",
                    title: t("lacerta.canvasEditor.alignLeft", "Align Left"),
                  },
                  {
                    dir: "center-h" as const,
                    label: "↔",
                    title: t(
                      "lacerta.canvasEditor.centerHorizontally",
                      "Center Horizontally",
                    ),
                  },
                  {
                    dir: "right" as const,
                    label: "⇤",
                    title: t("lacerta.canvasEditor.alignRight", "Align Right"),
                  },
                  {
                    dir: "top" as const,
                    label: "⇡",
                    title: t("lacerta.canvasEditor.alignTop", "Align Top"),
                  },
                  {
                    dir: "center-v" as const,
                    label: "↕",
                    title: t(
                      "lacerta.canvasEditor.centerVertically",
                      "Center Vertically",
                    ),
                  },
                  {
                    dir: "bottom" as const,
                    label: "⇣",
                    title: t(
                      "lacerta.canvasEditor.alignBottom",
                      "Align Bottom",
                    ),
                  },
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
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
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                willChange: "transform",
              }}
            >
              <div className="relative w-0 h-0 pointer-events-auto">
                {/* SVG Layer for rendering connectors */}
                <svg className="absolute overflow-visible pointer-events-none w-0 h-0 z-0">
                  <defs>
                    <marker
                      id="normal"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="currentColor" />
                    </marker>
                    <marker
                      id="association"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path
                        d="M 0 1.5 L 8 5 L 0 8.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </marker>
                    <marker
                      id="composition"
                      viewBox="0 0 12 12"
                      refX="10"
                      refY="6"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path
                        d="M 0 6 L 5 2 L 10 6 L 5 10 Z"
                        fill="currentColor"
                      />
                    </marker>
                    <marker
                      id="aggregation"
                      viewBox="0 0 12 12"
                      refX="10"
                      refY="6"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path
                        d="M 0 6 L 5 2 L 10 6 L 5 10 Z"
                        fill="var(--background)"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
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
                          data-block-sidebar={true}
                          onMouseDown={(e) => startDragNode(e, node)}
                          onTouchStart={(e) => startDragNodeTouch(e, node)}
                          className={(() => {
                            const isSelected = selectedNodeIds.includes(
                              node.id,
                            );
                            let cls = `absolute flex flex-col pointer-events-auto group transition-all `;
                            if (node.type === "group") {
                              cls += cn(
                                "rounded-2xl border-2 border-dashed",
                                isSelected
                                  ? "border-primary/60 bg-primary/3"
                                  : `${preset.border} bg-transparent hover:bg-primary/2`,
                              );
                            } else if (
                              node.cardStyle === "header" ||
                              node.type === "rrImage"
                            ) {
                              cls += cn(
                                "border-0 bg-transparent shadow-none",
                                node.color?.startsWith("#") ? "" : preset.text,
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
                                node.color?.startsWith("#") ? "" : preset.bg,
                                node.color?.startsWith("#")
                                  ? ""
                                  : preset.border,
                                isSelected
                                  ? "ring-2 ring-primary shadow-lg"
                                  : "hover:shadow-md",
                              );
                            }
                            if (node.lockPosition) cls += " cursor-not-allowed";
                            if (lockedElements[node.id])
                              cls += " opacity-80 border-destructive/30";
                            return cls;
                          })()}
                          style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                            zIndex: node.type === "group" ? 0 : undefined,
                            // Inline styles for custom hex colors
                            ...(node.color && node.color.startsWith("#")
                              ? node.type === "rrImage" ||
                                node.cardStyle === "header"
                                ? {
                                    color: node.color,
                                  }
                                : {
                                    backgroundColor: `${node.color}1a`, // 10% opacity
                                    borderColor: `${node.color}80`, // 50% opacity
                                  }
                              : {}),
                          }}
                        >
                          {/* Lock indicator overlay */}
                          {lockedElements[node.id] && (
                            <div className="absolute top-2 right-2 z-40 bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-[8px] font-bold flex items-center gap-1 shadow-md pointer-events-none select-none">
                              <Lock className="h-2.5 w-2.5 animate-pulse" />
                              <span>
                                Locked by {lockedElements[node.id].username}
                              </span>
                            </div>
                          )}
                          {/* Card Content Area */}
                          <div
                            className={cn(
                              "flex-1 w-full h-full overflow-hidden flex flex-col",
                              node.cardStyle === "sticky"
                                ? "bg-warning/5 text-foreground rounded-lg"
                                : node.type === "rrImage"
                                  ? "bg-transparent rounded-2xl"
                                  : node.cardStyle === "header"
                                    ? "bg-transparent text-foreground font-extrabold text-xl"
                                    : "bg-card/50 backdrop-blur-md rounded-2xl",
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
                                  editable={!lockedElements[node.id]}
                                />
                              </div>
                            ) : (
                              <RrCanvasCardContent
                                node={node}
                                selected={selectedNodeId === node.id}
                                accessToken={accessToken}
                                zoom={zoom}
                                isLocked={!!lockedElements[node.id]}
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
                            onTouchStart={(e) => startResizeNodeTouch(e, node)}
                            className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Maximize2 className="h-2.5 w-2.5 rotate-90" />
                          </div>

                          {/* Drag-Connector Ports (Visible on hover) */}
                          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {/* Sides */}
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "top")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "top")
                              }
                              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "right")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "right")
                              }
                              className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "bottom")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "bottom")
                              }
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "left")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "left")
                              }
                              className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />

                            {/* Corners */}
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "top-left")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "top-left")
                              }
                              className="absolute top-0 left-0 -translate-x-1 -translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "top-right")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "top-right")
                              }
                              className="absolute top-0 right-0 translate-x-1 -translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "bottom-left")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "bottom-left")
                              }
                              className="absolute bottom-0 left-0 -translate-x-1 translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                            <div
                              onMouseDown={(e) =>
                                startConnecting(e, node.id, "bottom-right")
                              }
                              onMouseUp={(e) =>
                                completeConnection(e, node.id, "bottom-right")
                              }
                              className="absolute bottom-0 right-0 translate-x-1 translate-y-1 w-2 h-2 rounded-full border border-indigo-400 bg-indigo-500 cursor-crosshair pointer-events-auto hover:scale-125 hover:bg-emerald-500 transition-all shadow-sm flex items-center justify-center animate-in fade-in zoom-in duration-100"
                            />
                          </div>
                        </div>

                        {/* Chart Settings Floating Panel */}
                        {node.type === "graph" &&
                          selectedNodeId === node.id && (
                            <GraphSettingsPanel
                              node={node}
                              getPanelStyle={getPanelStyle}
                              setNodes={setNodes}
                              setIsDirty={setIsDirty}
                            />
                          )}

                        {/* Mermaid / UML Settings Floating Panel */}
                        {(node.type === "mermaid" || node.type === "uml") &&
                          selectedNodeId === node.id && (
                            <MermaidSettingsPanel
                              node={node}
                              getPanelStyle={getPanelStyle}
                              setNodes={setNodes}
                              setIsDirty={setIsDirty}
                            />
                          )}

                        {/* Scientific Calculator Settings Floating Panel */}
                        {node.type === "scientific-calc" &&
                          selectedNodeId === node.id && (
                            <ScientificCalcSettingsPanel
                              node={node}
                              getPanelStyle={getPanelStyle}
                              lockedElements={lockedElements}
                              setNodes={setNodes}
                              setIsDirty={setIsDirty}
                            />
                          )}
                      </React.Fragment>
                    );
                  })}

                {/* Collaborator Cursor Pointers */}
                {collaborators.map((c) => {
                  if (!c.cursor) return null;
                  const color = getCollaboratorColor(
                    c.userId || c.socketId || c.username,
                  );
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
                        className={cn(
                          "w-4 h-4 fill-current drop-shadow-md",
                          color.text,
                        )}
                      >
                        <path d="M0 0 L16 12 L9 13.5 L16 22 L13 23 L6.5 15 L0 20 Z" />
                      </svg>
                      <div
                        className={cn(
                          "absolute top-4 left-3 px-2 py-0.5 border text-white text-[8px] font-bold rounded shadow whitespace-nowrap",
                          color.bg,
                        )}
                      >
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
              {t("lacerta.canvasEditor.reset", "Reset")}
            </button>
          </div>

          {/* Guest Username Dialog Prompt */}
          {showGuestPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col">
                <h3 className="text-sm font-bold text-card-foreground">
                  {t(
                    "lacerta.canvasEditor.enterGuestUsername",
                    "Enter Guest Username",
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-normal mt-1 mb-4">
                  {t(
                    "lacerta.canvasEditor.guestUsernameDesc",
                    "This is a zero-knowledge collaborative spatial canvas. Choose a username to represent yourself to other editors in the room.",
                  )}
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
                      toast.error(
                        t(
                          "lacerta.canvasEditor.enterUsernameError",
                          "Please enter a username",
                        ),
                      );
                    }
                  }}
                  className="py-2 bg-primary hover:bg-primary/90 font-semibold rounded-lg text-xs text-primary-foreground transition-all shadow-sm active:scale-98"
                >
                  {t(
                    "lacerta.canvasEditor.joinCollab",
                    "Join Collaboration Session",
                  )}
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

          <RrCanvasRrImageInsertModal
            isOpen={rrImagePrompt !== null}
            onClose={() => setRrImagePrompt(null)}
            x={rrImagePrompt?.x ?? 0}
            y={rrImagePrompt?.y ?? 0}
            createNodeAtPos={createNodeAtPos}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56 bg-popover border border-border text-popover-foreground shadow-lg backdrop-blur-md">
        {rightClickedNodeId ? (
          <>
            <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 text-muted-foreground/75">
              {t("lacerta.canvasEditor.cardActions", "Card Actions")}
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border" />

            {/* Color preset change */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Palette className="h-3.5 w-3.5 mr-2 text-primary" />
                {t("lacerta.canvasEditor.changeColor", "Change Color")}
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
                  <ContextMenuSeparator className="bg-border/30" />
                  <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/80 hover:bg-accent/40 rounded transition-colors select-none relative">
                    <span className="uppercase tracking-wider">
                      {t("lacerta.canvasEditor.customColor", "Custom Color")}
                    </span>
                    <input
                      type="color"
                      value={(() => {
                        const node = nodes.find(
                          (n) => n.id === rightClickedNodeId,
                        );
                        return node?.color?.startsWith("#")
                          ? node.color
                          : "#3b82f6";
                      })()}
                      onChange={(e) =>
                        handleNodeColorChange(
                          rightClickedNodeId!,
                          e.target.value,
                        )
                      }
                      className="w-5 h-5 rounded-md cursor-pointer border border-border bg-transparent p-0"
                    />
                  </div>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            {/* Change Sticker option for Emoji nodes */}
            {nodes.find((n) => n.id === rightClickedNodeId)?.type ===
              "emoji" && (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                  <Smile className="h-3.5 w-3.5 mr-2 text-warning" />
                  {t("lacerta.canvasEditor.changeSticker", "Change Sticker")}
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
                          <span>
                            {t("lacerta.canvasEditor.sticker", "Sticker")}
                          </span>
                        </ContextMenuItem>
                      ),
                    )}
                  </ContextMenuSubContent>
                </ContextMenuPortal>
              </ContextMenuSub>
            )}

            {/* Customize option for rrImage nodes */}
            {nodes.find((n) => n.id === rightClickedNodeId)?.type ===
              "rrImage" && (
              <ContextMenuItem
                onClick={() => {
                  const node = nodes.find((n) => n.id === rightClickedNodeId);
                  if (node) {
                    setRrImagePrompt({
                      x: node.x + node.width / 2,
                      y: node.y + node.height / 2,
                    });
                  }
                }}
                className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2"
              >
                <ImageIcon className="h-3.5 w-3.5 mr-2 text-violet-500" />
                {t("lacerta.canvasEditor.changeImage", "Change Image")}
              </ContextMenuItem>
            )}

            {/* Change Callout style option for Callout nodes */}
            {nodes.find((n) => n.id === rightClickedNodeId)?.type ===
              "callout" && (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 mr-2 text-rose-500" />
                  {t("lacerta.canvasEditor.calloutStyle", "Callout Style")}
                </ContextMenuSubTrigger>
                <ContextMenuPortal>
                  <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                    {[
                      {
                        type: "info",
                        colorClass: "text-blue-500",
                        label: t("lacerta.canvasEditor.info", "Info"),
                      },
                      {
                        type: "warning",
                        colorClass: "text-amber-500",
                        label: t("lacerta.canvasEditor.warning", "Warning"),
                      },
                      {
                        type: "success",
                        colorClass: "text-emerald-500",
                        label: t("lacerta.canvasEditor.success", "Success"),
                      },
                      {
                        type: "error",
                        colorClass: "text-rose-500",
                        label: t("lacerta.canvasEditor.danger", "Danger"),
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
                {t("lacerta.canvasEditor.arrange", "Arrange")}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[160px]">
                  <ContextMenuItem
                    onClick={() => bringToFront(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("lacerta.canvasEditor.bringToFront", "Bring to Front")}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => sendToBack(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("lacerta.canvasEditor.sendToBack", "Send to Back")}
                  </ContextMenuItem>
                  <ContextMenuSeparator className="bg-border/30" />
                  <ContextMenuItem
                    onClick={() => toggleLock(rightClickedNodeId!)}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {nodes.find((n) => n.id === rightClickedNodeId)
                      ?.lockPosition
                      ? `🔓 ${t("lacerta.canvasEditor.unlockPosition", "Unlock Position")}`
                      : `🔒 ${t("lacerta.canvasEditor.lockPosition", "Lock Position")}`}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            <ContextMenuItem
              onClick={() => handleNodeDelete(rightClickedNodeId!)}
              className="focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer text-xs font-semibold px-3 py-2"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {t("lacerta.canvasEditor.deleteCard", "Delete Card")}
            </ContextMenuItem>
          </>
        ) : rightClickedEdgeId ? (
          <>
            <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 text-muted-foreground/75">
              {t("lacerta.canvasEditor.connectorActions", "Connector Actions")}
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border" />

            {/* Set Connection Label */}
            <ContextMenuItem
              onClick={() => {
                const edge = edges.find((e) => e.id === rightClickedEdgeId);
                const label = prompt(
                  t(
                    "lacerta.canvasEditor.enterConnectionLabel",
                    "Enter connection label:",
                  ),
                  edge?.label || "",
                );
                if (label !== null) {
                  setEdges((prev) =>
                    prev.map((ed) =>
                      ed.id === rightClickedEdgeId ? { ...ed, label } : ed,
                    ),
                  );
                  setIsDirty(true);
                }
              }}
              className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-2 text-xs font-semibold"
            >
              <Type className="h-3.5 w-3.5 mr-2 text-indigo-400" />
              {t(
                "lacerta.canvasEditor.setConnectionLabel",
                "Set Connection Label",
              )}
            </ContextMenuItem>

            <ContextMenuSeparator className="bg-border/30" />

            {/* Preset Color Selector */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Palette className="h-3.5 w-3.5 mr-2 text-primary" />
                {t(
                  "lacerta.canvasEditor.changePresetColor",
                  "Change Preset Color",
                )}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                  {(
                    [
                      { name: "slate", color: "var(--muted-foreground)" },
                      { name: "blue", color: "#3b82f6" },
                      { name: "emerald", color: "#10b981" },
                      { name: "rose", color: "#ef4444" },
                      { name: "purple", color: "#a855f7" },
                      { name: "teal", color: "#14b8a6" },
                      { name: "fuchsia", color: "#d946ef" },
                      { name: "orange", color: "#f97316" },
                      { name: "indigo", color: "#6366f1" },
                    ] as const
                  ).map((p) => (
                    <ContextMenuItem
                      key={p.name}
                      onClick={() => {
                        setEdges((prev) =>
                          prev.map((ed) =>
                            ed.id === rightClickedEdgeId
                              ? { ...ed, color: p.color }
                              : ed,
                          ),
                        );
                        setIsDirty(true);
                      }}
                      className="focus:bg-accent focus:text-accent-foreground cursor-pointer flex items-center px-3 py-1.5 text-xs font-semibold"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full mr-2"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="capitalize">{p.name}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            {/* Custom Color Selector */}
            <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/80 hover:bg-accent/40 rounded transition-colors select-none relative">
              <span className="uppercase tracking-wider">
                {t("lacerta.canvasEditor.customColor", "Custom Color")}
              </span>
              <input
                type="color"
                value={(() => {
                  const edge = edges.find((e) => e.id === rightClickedEdgeId);
                  return edge?.color || "#6366f1";
                })()}
                onChange={(e) => {
                  const color = e.target.value;
                  setEdges((prev) =>
                    prev.map((ed) =>
                      ed.id === rightClickedEdgeId ? { ...ed, color } : ed,
                    ),
                  );
                  setIsDirty(true);
                }}
                className="w-5 h-5 rounded-md cursor-pointer border border-border bg-transparent p-0"
              />
            </div>
            <ContextMenuItem
              onClick={() => {
                setEdges((prev) =>
                  prev.map((ed) =>
                    ed.id === rightClickedEdgeId
                      ? { ...ed, color: undefined }
                      : ed,
                  ),
                );
                setIsDirty(true);
              }}
              className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
            >
              {t(
                "lacerta.canvasEditor.resetToThemeColor",
                "Reset to Theme Color",
              )}
            </ContextMenuItem>

            <ContextMenuSeparator className="bg-border/30" />

            {/* Line Shape (Curved / Straight) */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <ChevronRight className="h-3.5 w-3.5 mr-2 text-warning" />
                {t("lacerta.canvasEditor.lineShape", "Line Shape")}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                  <ContextMenuItem
                    onClick={() => {
                      setEdges((prev) =>
                        prev.map((ed) =>
                          ed.id === rightClickedEdgeId
                            ? { ...ed, lineStyle: "curved" }
                            : ed,
                        ),
                      );
                      setIsDirty(true);
                    }}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("lacerta.canvasEditor.curved", "Curved")}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      setEdges((prev) =>
                        prev.map((ed) =>
                          ed.id === rightClickedEdgeId
                            ? { ...ed, lineStyle: "straight" }
                            : ed,
                        ),
                      );
                      setIsDirty(true);
                    }}
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    {t("lacerta.canvasEditor.straight", "Straight")}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            {/* Line styles */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                {t("lacerta.canvasEditor.lineStyle", "Line Style")}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[120px]">
                  {(
                    [
                      {
                        type: "solid" as const,
                        label: t("lacerta.canvasEditor.solid", "Solid"),
                      },
                      {
                        type: "dashed" as const,
                        label: t("lacerta.canvasEditor.dashed", "Dashed"),
                      },
                      {
                        type: "dotted" as const,
                        label: t("lacerta.canvasEditor.dotted", "Dotted"),
                      },
                      {
                        type: "dashed-dotted" as const,
                        label: t(
                          "lacerta.canvasEditor.dashedDotted",
                          "Dashed & Dotted",
                        ),
                      },
                    ] as const
                  ).map((tVal) => (
                    <ContextMenuItem
                      key={tVal.type}
                      onClick={() => {
                        setEdges((prev) =>
                          prev.map((ed) =>
                            ed.id === rightClickedEdgeId
                              ? { ...ed, lineType: tVal.type }
                              : ed,
                          ),
                        );
                        setIsDirty(true);
                      }}
                      className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                    >
                      <span>{tVal.label}</span>
                      {(edges.find((ed) => ed.id === rightClickedEdgeId)
                        ?.lineType || "solid") === tVal.type && (
                        <span className="ml-auto text-[8px]">✓</span>
                      )}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            {/* Arrow Type */}
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                {t("lacerta.canvasEditor.arrowType", "Arrow Type")}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[140px]">
                  {(
                    [
                      {
                        type: "normal" as const,
                        label: t("lacerta.canvasEditor.normal", "Normal"),
                      },
                      {
                        type: "association" as const,
                        label: t(
                          "lacerta.canvasEditor.association",
                          "Association",
                        ),
                      },
                      {
                        type: "composition" as const,
                        label: t(
                          "lacerta.canvasEditor.composition",
                          "Composition",
                        ),
                      },
                      {
                        type: "aggregation" as const,
                        label: t(
                          "lacerta.canvasEditor.aggregation",
                          "Aggregation",
                        ),
                      },
                    ] as const
                  ).map((tVal) => (
                    <ContextMenuItem
                      key={tVal.type}
                      onClick={() => {
                        setEdges((prev) =>
                          prev.map((ed) =>
                            ed.id === rightClickedEdgeId
                              ? { ...ed, arrowType: tVal.type }
                              : ed,
                          ),
                        );
                        setIsDirty(true);
                      }}
                      className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                    >
                      <span>{tVal.label}</span>
                      {(edges.find((ed) => ed.id === rightClickedEdgeId)
                        ?.arrowType || "normal") === tVal.type && (
                        <span className="ml-auto text-[8px]">✓</span>
                      )}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuPortal>
            </ContextMenuSub>

            <ContextMenuSeparator className="bg-border" />
            <ContextMenuItem
              onClick={() => {
                setEdges((prev) =>
                  prev.filter((ed) => ed.id !== rightClickedEdgeId),
                );
                setRightClickedEdgeId(null);
                setIsDirty(true);
              }}
              className="focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer text-xs font-semibold px-3 py-2"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {t("lacerta.canvasEditor.deleteConnector", "Delete Connector")}
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuLabel className="text-[10px] uppercase font-bold tracking-wider px-3 py-2 text-muted-foreground/75">
              {t("lacerta.canvasEditor.canvasActions", "Canvas Actions")}
            </ContextMenuLabel>
            <ContextMenuSeparator className="bg-border" />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="focus:bg-accent focus:text-accent-foreground cursor-pointer text-xs font-semibold px-3 py-2">
                <Plus className="h-3.5 w-3.5 mr-2 text-primary" />
                {t("lacerta.canvasEditor.insert", "Insert")}
              </ContextMenuSubTrigger>
              <ContextMenuPortal>
                <ContextMenuSubContent className="bg-popover border border-border text-popover-foreground shadow-lg min-w-[190px] max-h-[420px] overflow-y-auto no-scrollbar">
                  {/* Category: Text & Notes */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    {t("lacerta.canvasEditor.textNotes", "Text & Notes")}
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
                    {t("lacerta.canvasEditor.documentCard", "Document Card")}
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
                    {t("lacerta.canvasEditor.stickyNote", "Sticky Note")}
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
                    {t("lacerta.canvasEditor.floatingTitle", "Floating Title")}
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
                    {t("lacerta.canvasEditor.calloutCard", "Callout Card")}
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
                    {t(
                      "lacerta.canvasEditor.annotationCard",
                      "Annotation Card",
                    )}
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Media & Embeds */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    {t("lacerta.canvasEditor.mediaEmbeds", "Media & Embeds")}
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
                    {t("lacerta.canvasEditor.imageCard", "Image Card")}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setRrImagePrompt({
                        x: rightClickPosition.x,
                        y: rightClickPosition.y,
                      })
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-2 text-violet-500" />
                    {t("lacerta.canvasEditor.rrImageCard", "rrImage Card")}
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
                    {t("lacerta.canvasEditor.gifCard", "GIF Card")}
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
                    {t("lacerta.canvasEditor.videoCard", "Video Card")}
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
                    {t("lacerta.canvasEditor.pdfCard", "PDF Document Card")}
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
                    {t("lacerta.canvasEditor.vaultFile", "Lacerta Vault File")}
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Diagrams & Stickers */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    {t(
                      "lacerta.canvasEditor.diagramsStickers",
                      "Diagrams & Stickers",
                    )}
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
                    {t(
                      "lacerta.canvasEditor.whiteboardSketchpad",
                      "Whiteboard Sketchpad",
                    )}
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
                    {t(
                      "lacerta.canvasEditor.mermaidDiagram",
                      "Mermaid Diagram",
                    )}
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
                    {t("lacerta.canvasEditor.umlCard", "UML Card")}
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
                    {t("lacerta.canvasEditor.emojiSticker", "Emoji Sticker")}
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
                    {t("lacerta.canvasEditor.groupFrame", "Group Frame")}
                  </ContextMenuItem>

                  <ContextMenuSeparator className="bg-border" />

                  {/* Category: Data & Analytics */}
                  <ContextMenuLabel className="text-[9px] font-bold text-muted-foreground px-3 py-1 uppercase tracking-wider">
                    {t(
                      "lacerta.canvasEditor.dataAnalytics",
                      "Data & Analytics",
                    )}
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
                    {t("lacerta.canvasEditor.codeBlock", "Code Block")}
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
                    {t("lacerta.canvasEditor.tasksList", "Tasks List")}
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
                    {t("lacerta.canvasEditor.tableCard", "Table Card")}
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
                    {t(
                      "lacerta.canvasEditor.interactiveGraph",
                      "Interactive Graph",
                    )}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "scientific-calc",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Calculator className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                    {t(
                      "lacerta.canvasEditor.scientificCalculator",
                      "Scientific Calculator",
                    )}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      createNodeAtPos(
                        "graphing-calc",
                        rightClickPosition.x,
                        rightClickPosition.y,
                      )
                    }
                    className="focus:bg-accent focus:text-accent-foreground cursor-pointer px-3 py-1.5 text-xs font-semibold"
                  >
                    <Calculator className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                    {t(
                      "lacerta.canvasEditor.graphingCalculator",
                      "Graphing Calculator",
                    )}
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
