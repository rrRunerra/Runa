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
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasCardContentProps {
  node: CanvasNode;
  selected: boolean;
  accessToken: string;
  zoom: number;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasCardContent({
  node,
  selected,
  accessToken,
  zoom,
  onNodeUpdate,
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
      return <RrCanvasTableCard node={node} onNodeUpdate={onNodeUpdate} />;
    case "graph":
      return <RrCanvasGraphCard node={node} />;
    case "drawing":
      return <RrCanvasDrawingCard node={node} zoom={zoom} onNodeUpdate={onNodeUpdate} />;
    case "emoji":
      return <RrCanvasEmojiCard node={node} />;
    case "pdf":
      return <RrCanvasPdfCard node={node} accessToken={accessToken} />;
    case "callout":
      return <RrCanvasCalloutCard node={node} onNodeUpdate={onNodeUpdate} />;
    case "annotation":
      return <RrCanvasAnnotationCard node={node} onNodeUpdate={onNodeUpdate} />;
    case "group":
      return <RrCanvasGroupCard node={node} selected={selected} onNodeUpdate={onNodeUpdate} />;
    default:
      return null;
  }
}
