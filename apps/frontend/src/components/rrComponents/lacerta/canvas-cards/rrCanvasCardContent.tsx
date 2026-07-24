"use client";

import React from "react";
import RrCanvasImageCard from "./rrCanvasImageCard";
import RrCanvasVideoCard from "./rrCanvasVideoCard";
import RrCanvasFileCard from "./rrCanvasFileCard";
import RrCanvasMermaidCard from "./rrCanvasMermaidCard";
import RrCanvasUmlCard from "./rrCanvasUmlCard";
import RrCanvasGifCard from "./rrCanvasGifCard";
import RrCanvasTableCard from "./rrCanvasTableCard";
import RrCanvasGraphCard from "./rrCanvasGraphCard";
import RrCanvasDrawingCard from "./rrCanvasDrawingCard";
import RrCanvasEmojiCard from "./rrCanvasEmojiCard";
import RrCanvasPdfCard from "./rrCanvasPdfCard";
import RrCanvasCalloutCard from "./rrCanvasCalloutCard";
import RrCanvasAnnotationCard from "./rrCanvasAnnotationCard";
import RrCanvasGroupCard from "./rrCanvasGroupCard";
import RrCanvasRrImageCard from "./rrCanvasRrImageCard";
import RrCanvasScientificCalcCard from "./rrCanvasScientificCalcCard";
import RrCanvasGraphingCalcCard from "./rrCanvasGraphingCalcCard";
import RrCanvas3DCard from "./rrCanvas3DCard";
import { CanvasNode } from "../types";

interface RrCanvasCardContentProps {
  node: CanvasNode;
  selected: boolean;
  accessToken: string;
  zoom: number;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
  onOpen3DEditor?: (node: CanvasNode) => void;
}

function RrCanvasCardContent({
  node,
  selected,
  accessToken,
  zoom,
  isLocked = false,
  onNodeUpdate,
  onOpen3DEditor,
}: RrCanvasCardContentProps) {
  switch (node.type) {
    case "image":
      return <RrCanvasImageCard node={node} accessToken={accessToken} />;
    case "video":
      return <RrCanvasVideoCard node={node} selected={selected} />;
    case "file":
      return <RrCanvasFileCard node={node} accessToken={accessToken} />;
    case "mermaid":
      return <RrCanvasMermaidCard node={node} />;
    case "uml":
      return <RrCanvasUmlCard node={node} />;
    case "gif":
      return <RrCanvasGifCard node={node} />;
    case "table":
      return <RrCanvasTableCard node={node} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "graph":
      return <RrCanvasGraphCard node={node} />;
    case "drawing":
      return <RrCanvasDrawingCard node={node} zoom={zoom} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "emoji":
      return <RrCanvasEmojiCard node={node} />;
    case "pdf":
      return <RrCanvasPdfCard node={node} accessToken={accessToken} />;
    case "callout":
      return <RrCanvasCalloutCard node={node} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "annotation":
      return <RrCanvasAnnotationCard node={node} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "group":
      return <RrCanvasGroupCard node={node} selected={selected} onNodeUpdate={onNodeUpdate} />;
    case "rrImage":
      return <RrCanvasRrImageCard node={node} />;
    case "scientific-calc":
      return <RrCanvasScientificCalcCard node={node} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "graphing-calc":
      return <RrCanvasGraphingCalcCard node={node} isLocked={isLocked} onNodeUpdate={onNodeUpdate} />;
    case "object3d":
      return <RrCanvas3DCard node={node} onOpenEditor={onOpen3DEditor} />;
    default:
      return null;
  }
}

export default React.memo(RrCanvasCardContent);
