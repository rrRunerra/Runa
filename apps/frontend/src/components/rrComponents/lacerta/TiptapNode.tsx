"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Node, mergeAttributes } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { ramerDouglasPeucker } from "@/lib/coordinates";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Image as ImageIcon,
  Paintbrush,
  Heading1,
  Heading2,
  Trash2,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Custom Drawing Block Extension
// -----------------------------------------------------------------------------
interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface DrawingAttrs {
  lines: Stroke[];
}

interface DrawingComponentProps {
  node: {
    attrs: DrawingAttrs;
  };
  updateAttributes: (attrs: Partial<DrawingAttrs>) => void;
}

const DrawingComponent: React.FC<DrawingComponentProps> = ({
  node,
  updateAttributes,
}) => {
  const lines = node.attrs.lines || [];
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<Stroke | null>(null);
  const [strokeColor, setStrokeColor] = useState("var(--primary)");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getCoordinates = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ): Point | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();

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

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStart = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    // Only draw with primary mouse button click or touch
    if ("button" in e && e.button !== 0) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentLine({
      points: [coords],
      color: strokeColor,
      width: strokeWidth,
    });
    setIsDrawing(true);
  };

  const handleMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (!isDrawing || !currentLine) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentLine({
      ...currentLine,
      points: [...currentLine.points, coords],
    });
  };

  const handleEnd = () => {
    if (isDrawing && currentLine && currentLine.points.length > 1) {
      const simplifiedPoints = ramerDouglasPeucker(currentLine.points, 1.5);
      updateAttributes({
        lines: [...lines, { ...currentLine, points: simplifiedPoints }],
      });
    }
    setIsDrawing(false);
    setCurrentLine(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    updateAttributes({ lines: [] });
  };

  return (
    <NodeViewWrapper className="my-3 p-3 border border-border bg-card/50 rounded-xl relative group max-w-full">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-border/80 text-[10px]">
        <span className="font-semibold text-muted-foreground/80 flex items-center gap-1.5">
          <Paintbrush className="h-3 w-3 text-primary" />
          Inline Sketch
        </span>
        <div
          className="flex items-center gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-4 h-4 rounded border border-border cursor-pointer bg-transparent"
          />
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="bg-muted border border-border rounded p-0.5 text-[9px] font-medium text-foreground focus:outline-none"
          >
            <option value="2">Thin</option>
            <option value="4">Medium</option>
            <option value="8">Thick</option>
          </select>
          <button
            onClick={handleClear}
            className="px-2 py-0.5 bg-destructive/10 text-destructive hover:bg-destructive/15 rounded text-[9px] font-semibold transition-all"
          >
            Clear
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="w-full h-[180px] border border-dashed border-border bg-muted/5 rounded-lg cursor-crosshair touch-none select-none"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {lines.map((l, i) => (
          <path
            key={i}
            d={`M ${l.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
            fill="none"
            stroke={l.color}
            strokeWidth={l.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {currentLine && (
          <path
            d={`M ${currentLine.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
            fill="none"
            stroke={currentLine.color}
            strokeWidth={currentLine.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </NodeViewWrapper>
  );
};

const DrawingBlock = Node.create({
  name: "drawingBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      lines: {
        default: [],
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "drawing-block",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["drawing-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingComponent as any);
  },
});

// -----------------------------------------------------------------------------
// TiptapNode Component
// -----------------------------------------------------------------------------
interface TiptapNodeProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

export default function TiptapNode({
  content,
  onChange,
  editable = true,
}: TiptapNodeProps): React.JSX.Element {
  const isFirstRender = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default non-highlighted code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      DrawingBlock,
    ],
    content: content,
    editable: editable,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync content when it changes externally, but prevent infinite loop
  useEffect(() => {
    if (!editor) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only update if the content has actually drifted
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor)
    return (
      <div className="animate-pulse bg-muted rounded h-full min-h-[100px]" />
    );

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const addImage = () => {
    const url = prompt("Enter Image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertDrawing = () => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "drawingBlock", attrs: { lines: [] } })
      .run();
  };

  const isCodeBlock = editor?.isActive("codeBlock") ?? false;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Floating Bubble Menu (shows up when text is selected) */}
      {editable && !isCodeBlock && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 p-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg backdrop-blur-sm z-50 select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("bold") ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("italic") ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="H1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="H2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("bulletList") ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("orderedList") ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-muted transition-colors ${editor.isActive("taskList") ? "bg-muted text-primary" : "text-muted-foreground"}`}
            title="Task List"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
        </BubbleMenu>
      )}

      {/* Editor Floating block-insertion menu (shows up on empty lines) */}
      {editable && !isCodeBlock && (
        <FloatingMenu
          editor={editor}
          className="flex items-center gap-1.5 p-1.5 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg backdrop-blur-sm z-50 select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={insertTable}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Insert Table"
          >
            <TableIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={addImage}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Insert Image URL"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={insertDrawing}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1 font-bold text-[9px] border border-dashed border-border"
            title="Insert Inline Drawing"
          >
            <Paintbrush className="h-3.5 w-3.5 text-primary" />
            Sketch
          </button>
        </FloatingMenu>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[150px] outline-none text-xs leading-relaxed prose prose-sm dark:prose-invert max-w-none">
        <EditorContent editor={editor} className="outline-none min-h-full" />
      </div>
    </div>
  );
}
