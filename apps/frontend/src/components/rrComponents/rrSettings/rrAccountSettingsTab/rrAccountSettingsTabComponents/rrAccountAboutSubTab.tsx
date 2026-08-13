"use client";

import type React from "react";
import { RrMarkdownBioEditor } from "./rrMarkdownBioEditor";

export interface RrAccountAboutSubTabProps {
  bio: string;
  setBio: (bio: string) => void;
}

/**
 * About Me subtab component for editing user bio with live Markdown preview.
 */
export function RrAccountAboutSubTab({
  bio,
  setBio,
}: RrAccountAboutSubTabProps): React.JSX.Element {
  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full text-left">
      <RrMarkdownBioEditor bio={bio} setBio={setBio} />
    </div>
  );
}
