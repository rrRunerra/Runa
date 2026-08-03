"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import DOMPurify, { Config } from "dompurify";
import { useTheme } from "next-themes";

interface RrSanitizedEmailIframeProps {
  htmlContent: string;
  loadRemoteContent: boolean;
  zoom?: number;
  className?: string;
}

export default function RrSanitizedEmailIframe({
  htmlContent,
  loadRemoteContent,
  zoom = 1,
  className,
}: RrSanitizedEmailIframeProps): React.JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(300);
  const { resolvedTheme } = useTheme();

  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return "";

    // Config for DOMPurify
    const purifyConfig: Config = {
      ADD_TAGS: ["style", "center"],
      ADD_ATTR: [
        "target",
        "bgcolor",
        "align",
        "valign",
        "cellpadding",
        "cellspacing",
      ],
      FORBID_TAGS: [
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "textarea",
        "button",
      ],
    };

    let clean = DOMPurify.sanitize(htmlContent, purifyConfig);

    // If remote content is blocked, replace remote img src attributes with blocked placeholders
    if (!loadRemoteContent) {
      clean = clean.replace(
        /\bsrc=(["'])(https?:)?\/\/([^"']+)\1/gi,
        'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-blocked-src="$2//$3"',
      );
      clean = clean.replace(
        /\burl\((["']?)(https?:)?\/\/([^"')]+)\1\)/gi,
        'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")',
      );
    }

    return clean;
  }, [htmlContent, loadRemoteContent]);

  const fullDocString = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<base target="_blank"/>
<style>
  html, body {
    margin: 0;
    padding: 16px;
    word-break: break-word;
    overflow-x: auto;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    max-width: 100%;
  }
</style>
</head>
<body>
<div id="email-content-wrapper">${sanitizedHtml}</div>
<script>
  var currentZoom = ${zoom};
  function updateHeight() {
    try {
      var wrapper = document.getElementById('email-content-wrapper');
      var height = wrapper ? Math.round(wrapper.getBoundingClientRect().height + 32) : document.body.scrollHeight;
      window.parent.postMessage({ type: 'RR_EMAIL_IFRAME_RESIZE', height: height }, '*');
    } catch(e) {}
  }
  function applyZoom(z) {
    try {
      currentZoom = z;
      var wrapper = document.getElementById('email-content-wrapper');
      if (wrapper) {
        wrapper.style.zoom = z;
        wrapper.style.transform = 'scale(' + z + ')';
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.width = '100%';
        wrapper.style.display = 'inline-block';
        wrapper.style.minWidth = '100%';
        updateHeight();
      }
    } catch(e) {}
  }
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'RR_SET_ZOOM' && typeof e.data.zoom === 'number') {
      applyZoom(e.data.zoom);
    }
  });
  window.addEventListener('load', function() {
    applyZoom(currentZoom);
  });
  window.addEventListener('resize', updateHeight);
  var observer = new MutationObserver(updateHeight);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  setTimeout(updateHeight, 100);
  setTimeout(updateHeight, 500);
  setTimeout(updateHeight, 1500);
</script>
</body>
</html>`;
  }, [sanitizedHtml]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "RR_EMAIL_IFRAME_RESIZE" &&
        typeof event.data.height === "number"
      ) {
        setIframeHeight(Math.max(150, event.data.height));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: "RR_SET_ZOOM", zoom },
          "*",
        );
      } catch (e) {}
    }
  }, [zoom]);

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
      <iframe
        ref={iframeRef}
        srcDoc={fullDocString}
        title="Email Body Content"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        className={
          className || "w-full border-0 block transition-all duration-200"
        }
        style={{ height: `${iframeHeight}px` }}
      />
    </div>
  );
}
