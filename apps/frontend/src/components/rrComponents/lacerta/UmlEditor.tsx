"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  Database,
  User as ActorIcon,
  Columns3 as ClassIcon,
  CircleDot as StateIcon,
  Activity as ActivityIcon,
  FileText as NoteIcon,
  HelpCircle as UsecaseIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { encryptFileBuffer, encryptMetadataString, generateFileKey, exportRawKey, wrapFileKeyForUser } from "@/lib/lacertaCrypto";
import { cn } from "@/lib/utils";

interface UmlFileItem {
  id: string;
  name: string;
  key: string;
  decryptedKey: CryptoKey | null;
  wrappedKey?: string;
  parentId?: string | null;
  isVault?: boolean;
  type?: string | null;
}

interface UmlEditorProps {
  isOpen: boolean;
  onClose: () => void;
  file: UmlFileItem | null;
  initialContent: string;
  accessToken: string;
  onSaveSuccess: () => void;
  isReadOnly?: boolean;
  userPublicKey?: string | null;
}

interface UmlNode {
  id: string;
  type:
    | "class"
    | "actor"
    | "usecase"
    | "state"
    | "activity"
    | "database"
    | "note";
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  fields?: string[]; // for class
  methods?: string[]; // for class
  notes?: string; // for state/note/activity
}

interface UmlEdge {
  id: string;
  fromNode: string;
  toNode: string;
  type: "association" | "inheritance" | "realization" | "dependency";
  label?: string;
}

const SHAPE_PRESETS = [
  { type: "class", label: "Class Block", icon: ClassIcon },
  { type: "actor", label: "Actor", icon: ActorIcon },
  { type: "usecase", label: "Use Case", icon: UsecaseIcon },
  { type: "state", label: "State Node", icon: StateIcon },
  { type: "activity", label: "Activity", icon: ActivityIcon },
  { type: "database", label: "Database", icon: Database },
  { type: "note", label: "Note", icon: NoteIcon },
];

export default function UmlEditor({
  isOpen,
  onClose,
  file,
  initialContent,
  accessToken,
  onSaveSuccess,
  isReadOnly = false,
  userPublicKey = null,
}: UmlEditorProps): React.JSX.Element | null {
  const [nodes, setNodes] = useState<UmlNode[]>([]);
  const [edges, setEdges] = useState<UmlEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Dragging states for canvas and elements
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [activeEdgeStart, setActiveEdgeStart] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const parsed = JSON.parse(initialContent || '{"nodes":[], "edges":[]}');
        setNodes(parsed.nodes || []);
        setEdges(parsed.edges || []);
      } catch (err) {
        setNodes([]);
        setEdges([]);
      }
      setSelectedNodeId(null);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialContent]);

  if (!isOpen || !file) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let fileKey = file.decryptedKey;
      let wrappedKey = file.wrappedKey || "";

      if (isReadOnly) {
        if (!userPublicKey) {
          throw new Error("Unable to save copy: user cryptographic keys not loaded.");
        }
        // Generate new key for the copy
        const newFileKey = await generateFileKey();
        const rawKeyStr = await exportRawKey(newFileKey);
        wrappedKey = await wrapFileKeyForUser(rawKeyStr, userPublicKey);
        fileKey = newFileKey;
      }

      if (!fileKey) {
        throw new Error("File key not found. Unlock E2EE storage first.");
      }

      const dataStr = JSON.stringify({ nodes, edges });
      const encoder = new TextEncoder();
      const rawBuffer = encoder.encode(dataStr).buffer;

      // Encrypt file & metadata
      const encryptedBuffer = await encryptFileBuffer(rawBuffer, fileKey);
      const encName = await encryptMetadataString(file.name, fileKey);
      const encType = await encryptMetadataString("application/uml", fileKey);

      const formData = new FormData();
      const blob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      formData.append("file", blob, file.name);
      formData.append("wrappedKey", wrappedKey);
      formData.append("name", encName);
      formData.append("size", blob.size.toString());
      formData.append("type", encType);

      if (isReadOnly) {
        if (file.parentId) {
          formData.append("parentId", file.parentId);
        }
        if (file.isVault) {
          formData.append("isVault", "true");
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/upload`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          }
        );
        if (!res.ok) throw new Error("Failed to save copy to server.");
        toast.success(`Successfully saved copy of ${file.name} to your files!`);
      } else {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.id}`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          },
        );
        if (!res.ok) throw new Error("Failed to save changes.");
        toast.success("UML Diagram saved successfully!");
      }

      setHasUnsavedChanges(false);
      onSaveSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save diagram.");
    } finally {
      setIsSaving(false);
    }
  };

  // Node Actions
  const addNode = (type: UmlNode["type"]) => {
    const id = `node-${Date.now()}`;
    const newNode: UmlNode = {
      id,
      type,
      x: 150 + Math.random() * 50,
      y: 150 + Math.random() * 50,
      width:
        type === "class"
          ? 180
          : type === "usecase"
            ? 140
            : type === "actor"
              ? 80
              : 120,
      height: type === "class" ? 120 : type === "actor" ? 90 : 60,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      fields: type === "class" ? ["- id: string"] : undefined,
      methods: type === "class" ? ["+ getName(): string"] : undefined,
      notes: type === "note" ? "Write notes..." : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
    setHasUnsavedChanges(true);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter(
        (e) => e.fromNode !== selectedNodeId && e.toNode !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
    setHasUnsavedChanges(true);
  };

  // Dragging Events
  const handleNodeMouseDown = (e: React.MouseEvent, node: UmlNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggedNodeId(node.id);

    const clientX = e.clientX;
    const clientY = e.clientY;
    setDragStartOffset({
      x: clientX - node.x,
      y: clientY - node.y,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (draggedNodeId) {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const nx = clientX - dragStartOffset.x;
      const ny = clientY - dragStartOffset.y;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNodeId
            ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) }
            : n,
        ),
      );
      setHasUnsavedChanges(true);
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedNodeId(null);
    setActiveEdgeStart(null);
  };

  // Drawing Edges
  const handleAnchorMouseDown = (
    e: React.MouseEvent,
    nodeId: string,
    node: UmlNode,
  ) => {
    e.stopPropagation();
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    setActiveEdgeStart({ nodeId, x: centerX, y: centerY });
  };

  const handleNodeMouseUp = (e: React.MouseEvent, targetNode: UmlNode) => {
    if (activeEdgeStart && activeEdgeStart.nodeId !== targetNode.id) {
      const newEdge: UmlEdge = {
        id: `edge-${Date.now()}`,
        fromNode: activeEdgeStart.nodeId,
        toNode: targetNode.id,
        type: "association",
      };
      setEdges((prev) => [...prev, newEdge]);
      setHasUnsavedChanges(true);
    }
    setActiveEdgeStart(null);
  };

  // Node Property Updaters
  const updateNodeProperty = (nodeId: string, updates: Partial<UmlNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    );
    setHasUnsavedChanges(true);
  };

  // Calculate connection points
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    };
  };

  const getEdgePath = (edge: UmlEdge) => {
    const from = getNodeCenter(edge.fromNode);
    const to = getNodeCenter(edge.toNode);
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground select-none">
      {/* Editor Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted/30 rounded-lg text-muted-foreground hover:text-foreground transition-all"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground">
              {file.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Visual UML Editor (Drag & Drop)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-[10px] bg-warning/10 text-warning px-2.5 py-0.5 rounded-full font-semibold border border-warning/20">
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isReadOnly ? "Save Copy" : "Save Diagram"}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Shapes */}
        <aside className="w-56 border-r border-border bg-card/25 backdrop-blur-md p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              UML Shapes
            </span>
            <div className="flex flex-col gap-2">
              {SHAPE_PRESETS.map((shape) => {
                const Icon = shape.icon;
                return (
                  <button
                    key={shape.type}
                    onClick={() => addNode(shape.type as any)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-muted/15 border border-border/40 hover:bg-muted/30 rounded-xl text-left text-xs font-semibold text-foreground transition-all hover:translate-x-0.5 active:scale-98"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    {shape.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto border-t border-border/40 pt-4 text-[10px] text-muted-foreground leading-normal flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider">
              Canvas Guide:
            </span>
            <span>• Drag shapes to position them.</span>
            <span>
              • Drag the red anchor dot in the center of a node to another node
              to connect them.
            </span>
            <span>• Double-click shapes to edit text/properties.</span>
          </div>
        </aside>

        {/* Canvas Board */}
        <div
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="flex-1 relative bg-muted/5 overflow-hidden cursor-default select-none"
          style={{
            backgroundImage:
              "radial-gradient(var(--border) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* SVGs for Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="20"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
              </marker>
              <marker
                id="inheritance"
                viewBox="0 0 10 10"
                refX="20"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 Z"
                  fill="var(--background)"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>

            {/* Saved Edges */}
            {edges.map((edge) => {
              const path = getEdgePath(edge);
              return (
                <g key={edge.id} className="group pointer-events-auto">
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeDasharray={
                      edge.type === "dependency" ? "6, 6" : undefined
                    }
                    className="cursor-pointer"
                    markerEnd={
                      edge.type === "inheritance"
                        ? "url(#inheritance)"
                        : "url(#arrow)"
                    }
                  />
                  {/* Invisible thick helper path for easier clicking */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="12"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEdges((prev) =>
                        prev.filter((ed) => ed.id !== edge.id),
                      );
                      setHasUnsavedChanges(true);
                      toast.info("Relation deleted");
                    }}
                  />
                </g>
              );
            })}

            {/* Temporary edge drawing line */}
            {activeEdgeStart && (
              <line
                x1={activeEdgeStart.x}
                y1={activeEdgeStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="var(--destructive)"
                strokeWidth="2"
                strokeDasharray="4, 4"
              />
            )}
          </svg>

          {/* Draggable Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={(e) => handleNodeMouseUp(e, node)}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
                className={cn(
                  "absolute rounded-xl border p-3 flex flex-col overflow-hidden bg-card/65 backdrop-blur-md select-none transition-shadow",
                  isSelected
                    ? "border-primary shadow-lg ring-1 ring-primary/30"
                    : "border-border/60 hover:border-border shadow-sm",
                )}
              >
                {/* Node Anchor Point (rendered in center for easy drag and drop connection) */}
                <div
                  onMouseDown={(e) => handleAnchorMouseDown(e, node.id, node)}
                  className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-600 cursor-crosshair z-10"
                  title="Drag connection to another shape"
                />

                {/* Node Layouts depending on UML shape type */}
                {node.type === "class" ? (
                  <div className="flex-1 flex flex-col text-left text-[11px] leading-tight select-none">
                    <div className="font-bold border-b border-border/50 pb-1 mb-1 text-center uppercase tracking-wider text-xs">
                      {node.name}
                    </div>
                    {/* Class Fields */}
                    <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[9px] text-muted-foreground/90 py-0.5 min-h-[25px]">
                      {(node.fields || []).map((f, i) => (
                        <div key={i} className="truncate">
                          {f}
                        </div>
                      ))}
                    </div>
                    {/* Class Methods */}
                    <div className="border-t border-border/40 pt-1 font-mono text-[9px] text-primary/80 py-0.5 min-h-[25px]">
                      {(node.methods || []).map((m, i) => (
                        <div key={i} className="truncate">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : node.type === "actor" ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <ActorIcon className="h-8 w-8 text-primary" />
                    <span className="text-[10px] font-bold text-center leading-tight">
                      {node.name}
                    </span>
                  </div>
                ) : node.type === "usecase" ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-primary/35 rounded-full p-2 bg-primary/2">
                    <span className="text-[10px] font-bold text-center leading-tight">
                      {node.name}
                    </span>
                  </div>
                ) : node.type === "note" ? (
                  <div className="flex-1 flex flex-col bg-warning/5 border-l-2 border-warning/50 p-1 text-[10px]">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-warning mb-0.5">
                      Note
                    </span>
                    <span className="text-muted-foreground italic leading-normal select-none overflow-hidden text-ellipsis line-clamp-3">
                      {node.notes || "Add text details..."}
                    </span>
                  </div>
                ) : (
                  // State / Activity / Database
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {node.type === "database" && (
                      <Database className="h-4 w-4 text-emerald-500" />
                    )}
                    {node.type === "state" && (
                      <StateIcon className="h-4 w-4 text-indigo-500" />
                    )}
                    {node.type === "activity" && (
                      <ActivityIcon className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-[11px] font-bold text-center leading-tight">
                      {node.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Settings Details Panel */}
        {selectedNode && (
          <aside className="w-80 border-l border-border bg-card/25 backdrop-blur-md p-5 flex flex-col gap-5 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Shape Settings
              </span>
              <button
                onClick={deleteSelectedNode}
                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                title="Delete shape"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                  Name / Title
                </label>
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) =>
                    updateNodeProperty(selectedNode.id, {
                      name: e.target.value,
                    })
                  }
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-medium"
                />
              </div>

              {selectedNode.type === "class" && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-wider flex items-center justify-between">
                      <span>Fields (attributes)</span>
                      <button
                        onClick={() => {
                          const f = selectedNode.fields || [];
                          updateNodeProperty(selectedNode.id, {
                            fields: [...f, "- newField: type"],
                          });
                        }}
                        className="text-[9px] font-bold text-primary hover:underline"
                      >
                        + Add
                      </button>
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {(selectedNode.fields || []).map((field, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={field}
                            onChange={(e) => {
                              const f = [...(selectedNode.fields || [])];
                              f[idx] = e.target.value;
                              updateNodeProperty(selectedNode.id, {
                                fields: f,
                              });
                            }}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => {
                              const f = (selectedNode.fields || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateNodeProperty(selectedNode.id, {
                                fields: f,
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider items-center justify-between">
                      <span>Methods (functions)</span>
                      <button
                        onClick={() => {
                          const m = selectedNode.methods || [];
                          updateNodeProperty(selectedNode.id, {
                            methods: [...m, "+ newMethod(): type"],
                          });
                        }}
                        className="text-[9px] font-bold text-primary hover:underline"
                      >
                        + Add
                      </button>
                    </label>
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {(selectedNode.methods || []).map((method, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={method}
                            onChange={(e) => {
                              const m = [...(selectedNode.methods || [])];
                              m[idx] = e.target.value;
                              updateNodeProperty(selectedNode.id, {
                                methods: m,
                              });
                            }}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => {
                              const m = (selectedNode.methods || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateNodeProperty(selectedNode.id, {
                                methods: m,
                              });
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(selectedNode.type === "note" ||
                selectedNode.type === "state" ||
                selectedNode.type === "activity") && (
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                    Detailed Notes / Description
                  </label>
                  <textarea
                    rows={4}
                    value={selectedNode.notes || ""}
                    onChange={(e) =>
                      updateNodeProperty(selectedNode.id, {
                        notes: e.target.value,
                      })
                    }
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-medium resize-none"
                  />
                </div>
              )}

              {/* Edge Relationship Properties Panel */}
              {edges.some(
                (e) =>
                  e.fromNode === selectedNode.id ||
                  e.toNode === selectedNode.id,
              ) && (
                <div className="mt-2 border-t border-border/40 pt-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                    Connections
                  </span>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto no-scrollbar">
                    {edges
                      .filter(
                        (e) =>
                          e.fromNode === selectedNode.id ||
                          e.toNode === selectedNode.id,
                      )
                      .map((edge) => {
                        const targetId =
                          edge.fromNode === selectedNode.id
                            ? edge.toNode
                            : edge.fromNode;
                        const targetNode = nodes.find((n) => n.id === targetId);
                        if (!targetNode) return null;
                        const role =
                          edge.fromNode === selectedNode.id
                            ? "Outgoing"
                            : "Incoming";

                        return (
                          <div
                            key={edge.id}
                            className="p-2.5 rounded-xl border border-border/40 bg-muted/5 flex flex-col gap-1.5 text-[10px]"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span>
                                {role} ➜ {targetNode.name}
                              </span>
                              <button
                                onClick={() => {
                                  setEdges((prev) =>
                                    prev.filter((ed) => ed.id !== edge.id),
                                  );
                                  setHasUnsavedChanges(true);
                                }}
                                className="text-destructive hover:underline text-[9px]"
                              >
                                Delete
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-[8px] uppercase font-bold shrink-0">
                                Rel:
                              </span>
                              <select
                                value={edge.type}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setEdges((prev) =>
                                    prev.map((ed) =>
                                      ed.id === edge.id
                                        ? { ...ed, type: val }
                                        : ed,
                                    ),
                                  );
                                  setHasUnsavedChanges(true);
                                }}
                                className="bg-background border border-border rounded px-1.5 py-0.5 text-[9px] font-medium text-foreground focus:outline-none cursor-pointer flex-1"
                              >
                                <option value="association">
                                  Association (Plain)
                                </option>
                                <option value="inheritance">
                                  Inheritance (Extends)
                                </option>
                                <option value="realization">
                                  Realization (Implements)
                                </option>
                                <option value="dependency">
                                  Dependency (Dashed)
                                </option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
