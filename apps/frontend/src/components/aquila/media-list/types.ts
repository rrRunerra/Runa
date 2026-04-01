export type DisplayType = "grid" | "list" | "compact";

export interface MediaEntry {
  id: string;
  title: string;
  score?: number;
  progress?: number;
  image: string;
  type: string;
  status: string;
  last_updated: string;
  last_added: string;
}

export interface MediaFilters {
  format?: string;
  status?: string;
  genres?: string[];
  country?: string;
  year?: number;
}

export interface MediaListDisplayProps {
  lists: string[];
  data: MediaEntry[];
  displayType: DisplayType;
  filters: MediaFilters;
  sort: "title" | "score" | "progress" | "last_updated" | "last_added";
  baseUrl: string;
}
