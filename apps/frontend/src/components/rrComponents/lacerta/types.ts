
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
  | "group"
  | "rrImage"
  | "scientific-calc"
  | "graphing-calc";

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

  // rrImage card
  rrImageId?: string; // SVG component key OR public image URL path
  rrImageType?: "svg" | "image";

  // Calculator properties
  variables?: Record<string, string>;
  memory?: number;
  ans?: string;
  equations?: string[];
  angleMode?: "deg" | "rad" | "grad";
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: "top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  toNode: string;
  toSide: "top" | "right" | "bottom" | "left" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  label?: string;
  color?: string;
  arrowType?: "normal" | "association" | "composition" | "aggregation";
  lineType?: "solid" | "dashed" | "dotted" | "dashed-dotted";
  lineStyle?: "curved" | "straight";
}

export interface Collaborator {
  socketId: string;
  userId?: string;
  username: string;
  cursor?: { x: number; y: number } | null;
}

export interface CanvasFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: any; // Using any to avoid crypto import mismatch issues in types
  wrappedKey?: string;
  parentId?: string | null;
  isPublic?: boolean;
}

export interface CanvasEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: CanvasFileItem | null;
  initialContent: string; // Plaintext JSON canvas
  accessToken: string;
  onSaveSuccess: () => void;
  guestMode?: boolean;
  decryptionKeyStr?: string | null;
}

export const COLOR_PRESETS = [
  {
    name: "slate",
    border: "border-border",
    bg: "bg-card/90",
    tag: "bg-muted text-muted-foreground",
    text: "text-foreground",
  },
  {
    name: "blue",
    border: "border-blue-500/50 dark:border-blue-400/40",
    bg: "bg-blue-500/10 dark:bg-blue-400/5",
    tag: "bg-primary/10 text-primary",
    text: "text-blue-500 dark:text-blue-400",
  },
  {
    name: "emerald",
    border: "border-emerald-500/50 dark:border-emerald-400/40",
    bg: "bg-emerald-500/10 dark:bg-emerald-400/5",
    tag: "bg-success/10 text-success",
    text: "text-emerald-500 dark:text-emerald-400",
  },
  {
    name: "rose",
    border: "border-rose-500/50 dark:border-rose-400/40",
    bg: "bg-rose-500/10 dark:bg-rose-400/5",
    tag: "bg-destructive/10 text-destructive",
    text: "text-rose-500 dark:text-rose-400",
  },
  {
    name: "purple",
    border: "border-purple-500/50 dark:border-purple-400/40",
    bg: "bg-purple-500/10 dark:bg-purple-400/5",
    tag: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    text: "text-purple-500 dark:text-purple-400",
  },
  {
    name: "teal",
    border: "border-teal-500/50 dark:border-teal-400/40",
    bg: "bg-teal-500/10 dark:bg-teal-400/5",
    tag: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    text: "text-teal-500 dark:text-teal-400",
  },
  {
    name: "fuchsia",
    border: "border-fuchsia-500/50 dark:border-fuchsia-400/40",
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-400/5",
    tag: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    text: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    name: "orange",
    border: "border-orange-500/50 dark:border-orange-400/40",
    bg: "bg-orange-500/10 dark:bg-orange-400/5",
    tag: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    text: "text-orange-500 dark:text-orange-400",
  },
  {
    name: "indigo",
    border: "border-indigo-500/50 dark:border-indigo-400/40",
    bg: "bg-indigo-500/10 dark:bg-indigo-400/5",
    tag: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    text: "text-indigo-500 dark:text-indigo-400",
  },
];

export const CURSOR_COLORS = [
  {
    text: "text-emerald-400",
    fill: "fill-emerald-400",
    bg: "bg-emerald-600 border-emerald-500 text-emerald-foreground",
  },
  {
    text: "text-blue-400",
    fill: "fill-blue-400",
    bg: "bg-blue-600 border-blue-500 text-blue-foreground",
  },
  {
    text: "text-rose-400",
    fill: "fill-rose-400",
    bg: "bg-rose-600 border-rose-500 text-rose-foreground",
  },
  {
    text: "text-amber-400",
    fill: "fill-amber-400",
    bg: "bg-amber-600 border-amber-500 text-amber-foreground",
  },
  {
    text: "text-purple-400",
    fill: "fill-purple-400",
    bg: "bg-purple-600 border-purple-500 text-purple-foreground",
  },
  {
    text: "text-teal-400",
    fill: "fill-teal-400",
    bg: "bg-teal-600 border-teal-500 text-teal-foreground",
  },
  {
    text: "text-pink-400",
    fill: "fill-pink-400",
    bg: "bg-pink-600 border-pink-500 text-pink-foreground",
  },
  {
    text: "text-indigo-400",
    fill: "fill-indigo-400",
    bg: "bg-indigo-600 border-indigo-500 text-indigo-foreground",
  },
];

export const getCollaboratorColor = (identifier: string) => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};
