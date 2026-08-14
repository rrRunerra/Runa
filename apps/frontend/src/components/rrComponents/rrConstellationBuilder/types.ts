export interface StarPoint {
  ra: number;
  dec: number;
  x: number;
  y: number;
}

export interface StarBookmarkData {
  ra: number;
  dec: number;
  magnitude: number;
  name: string;
}

export interface Bookmark {
  id: string;
  name: string;
  description?: string;
  redirect?: string;
  stars: StarBookmarkData[];
  connections: number[][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

export interface ExportData {
  name: string;
  description: string;
  redirect: string;
  id: string;
  stars: StarBookmarkData[];
  connections: number[][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

export interface ConstellationBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRedirect?: string;
  initialName?: string;
  initialIcon?: string;
  mode?: "bookmark" | "device";
}
