"use client";

import React from "react";
import { motion } from "framer-motion";

interface RrMediaDescriptionProps {
  description?: string | null;
  title?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

/**
 * Helper to safely parse description text without using dangerouslySetInnerHTML.
 * Handles:
 * - Line breaks: <br />, <br>, \n
 * - Bold: <strong>...</strong>, <b>...</b>, **...**, __...__
 * - Italic: <em>...</em>, <i>...</i>, *...*, _..._
 * - Spoiler: ~!...!~
 * - Links: <a href="URL">TEXT</a>, [TEXT](URL)
 */
export function parseSafeDescription(text: string): React.ReactNode {
  if (!text) return "";

  // Replace AniList spoilers ~!text!~ with unique tokens, and format bold/italic/links
  // Let's tokenize by finding the tags and splitting
  const regex = /(~![\s\S]*?!~|__.*?__|\*\*.*?\*\*|<b>.*?<\/b>|<strong>.*?<\/strong>|_.*?_|\*.*?\*|<i>.*?<\/i>|<em>.*?<\/em>|\[.*?\]\(.*?\)|<a\s+href="[^"]*">.*?<\/a>|<br\s*\/?>|\n)/gi;

  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Spoiler: ~!text!~
    if (part.startsWith("~!") && part.endsWith("!~")) {
      const content = part.slice(2, -2);
      return (
        <span
          key={index}
          className="bg-foreground/85 hover:bg-transparent text-transparent hover:text-foreground px-2 py-0.5 rounded-lg cursor-pointer transition-colors duration-200 select-none border border-border/20"
          title="Spoiler: Hover/Click to reveal"
        >
          {content}
        </span>
      );
    }

    // Bold: <strong>...</strong>, <b>...</b>, **...**, __...__
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.toLowerCase().startsWith("<strong>") && part.toLowerCase().endsWith("</strong>")) {
      return <strong key={index} className="font-bold">{part.slice(8, -9)}</strong>;
    }
    if (part.toLowerCase().startsWith("<b>") && part.toLowerCase().endsWith("</b>")) {
      return <strong key={index} className="font-bold">{part.slice(3, -4)}</strong>;
    }

    // Italic: <em>...</em>, <i>...</i>, *...*, _..._
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return <em key={index} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.toLowerCase().startsWith("<em>") && part.toLowerCase().endsWith("</em>")) {
      return <em key={index} className="italic">{part.slice(4, -5)}</em>;
    }
    if (part.toLowerCase().startsWith("<i>") && part.toLowerCase().endsWith("</i>")) {
      return <em key={index} className="italic">{part.slice(3, -4)}</em>;
    }

    // Line breaks: <br />, <br>, \n
    if (part === "\n" || part.toLowerCase().startsWith("<br")) {
      return <br key={index} />;
    }

    // Markdown Link: [text](url)
    if (part.startsWith("[") && part.includes("](")) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, linkText, url] = match;
        // Make relative paths absolute to AniList
        const href = url.startsWith("/") ? `https://anilist.co${url}` : url;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {linkText}
          </a>
        );
      }
    }

    // HTML Link: <a href="url">text</a>
    if (part.toLowerCase().startsWith("<a") && part.toLowerCase().endsWith("</a>")) {
      const hrefMatch = part.match(/href="([^"]*)"/i);
      const textMatch = part.match(/>(.*?)<\/a>/i);
      if (hrefMatch && textMatch) {
        const url = hrefMatch[1];
        const linkText = textMatch[1];
        // Make relative paths absolute to AniList
        const href = url.startsWith("/") ? `https://anilist.co${url}` : url;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {linkText}
          </a>
        );
      }
    }

    return part;
  });
}

export function RrMediaDescription({
  description,
  title = "Synopsis",
}: RrMediaDescriptionProps): React.JSX.Element {
  if (!description) {
    return <></>;
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card/30 border border-border/20 backdrop-blur-sm p-6 rounded-2xl"
    >
      <h3 className="text-base font-bold text-foreground mb-3">
        {title}
      </h3>
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm prose-p:my-2 prose-a:text-primary hover:prose-a:text-primary transition-colors">
        <p>{parseSafeDescription(description)}</p>
      </div>
    </motion.div>
  );
}
