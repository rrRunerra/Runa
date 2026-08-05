"use client";

import React from "react";
import { RrAnimeEditModal } from "./modals/RrAnimeEditModal";
import { RrMangaEditModal } from "./modals/RrMangaEditModal";
import { RrTvEditModal } from "./modals/RrTvEditModal";
import { RrMovieEditModal } from "./modals/RrMovieEditModal";
import { RrGameEditModal } from "./modals/RrGameEditModal";
import { RrBookEditModal } from "./modals/RrBookEditModal";

export interface RrMediaSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType?: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  actionType?: "CREATE" | "EDIT";
  mediaId?: number;
  initialData?: Record<string, any>;
  onSuccess?: () => void;
}

export function RrMediaSubmissionModal({
  isOpen,
  onClose,
  mediaType = "anime",
  actionType = "EDIT",
  mediaId,
  initialData = {},
  onSuccess,
}: RrMediaSubmissionModalProps): React.JSX.Element {
  const normType = (mediaType || "anime").toLowerCase();

  switch (normType) {
    case "manga":
      return (
        <RrMangaEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
    case "tv":
      return (
        <RrTvEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
    case "movie":
      return (
        <RrMovieEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
    case "game":
      return (
        <RrGameEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
    case "book":
      return (
        <RrBookEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
    case "anime":
    default:
      return (
        <RrAnimeEditModal
          isOpen={isOpen}
          onClose={onClose}
          actionType={actionType}
          mediaId={mediaId}
          initialData={initialData}
          onSuccess={onSuccess}
        />
      );
  }
}
