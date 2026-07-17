"use client";

import React, { useState, useEffect } from "react";
import mermaid from "mermaid";
import { useTranslation } from "react-i18next";

interface RrCanvasMermaidRendererProps {
  code: string;
  id: string;
}

export default function RrCanvasMermaidRenderer({ code, id }: RrCanvasMermaidRendererProps): React.JSX.Element {
  const { t } = useTranslation();
  const [svg, setSvg] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const renderGraph = async () => {
      const renderId = `mermaid-canvas-${id.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
      try {
        const { svg: html } = await mermaid.render(renderId, code);
        setSvg(html);
        setErr(null);
      } catch (e: any) {
        const badEl = document.getElementById(renderId);
        if (badEl) badEl.remove();
        setErr(t("lacerta.canvasEditor.syntaxError", "Syntax error"));
      }
    };
    renderGraph();
  }, [code, id, t]);

  if (err) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2 text-[9px] text-destructive bg-destructive/5 font-mono rounded">
        {err}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground animate-pulse">
        {t("lacerta.canvasEditor.rendering", "Rendering...")}
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto text-foreground"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
