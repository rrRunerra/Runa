import React from "react";
import { PROVIDERS_METADATA } from "@runa/connections/metadata";

export function getConnectionIcon(
  provider: string,
): React.ComponentType<React.ImgHTMLAttributes<HTMLImageElement>> {
  const meta = PROVIDERS_METADATA.find(
    (m) => m.id.toLowerCase() === provider.toLowerCase(),
  );

  return function ConnectionIcon(
    props: React.ImgHTMLAttributes<HTMLImageElement>,
  ): React.ReactElement | null {
    if (!meta?.icon) {
      return null;
    }
    return (
      <img
        src={meta.icon}
        alt=""
        width={20}
        height={20}
        {...props}
      />
    );
  };
}

export function getConnectionColorClass(provider: string): string {
  const meta = PROVIDERS_METADATA.find(
    (m) => m.id.toLowerCase() === provider.toLowerCase(),
  );
  if (meta?.accentColor) {
    return meta.accentColor;
  }

  const p = provider.toUpperCase();
  if (p === "DISCORD") return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  if (p === "ANILIST") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  if (p === "MAL") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-amber-500/10 text-amber-400 border-amber-500/20";
}

export function getConnectionProfileUrl(
  provider: string,
  username: string,
): string | null {
  const p = provider.toLowerCase();
  if (p === "anilist") return `https://anilist.co/user/${username}`;
  if (p === "mal") return `https://myanimelist.net/profile/${username}`;
  if (p === "simkl") return `https://simkl.com/profile/${username}`;
  return null;
}
