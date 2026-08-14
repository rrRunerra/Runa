import type { SidebarItem } from "@/types/SidebarConfig";

/**
 * 4-slot dock item positions mapping (slot "1" through "4" to shortcut href/key).
 */
export type DockPositions = Record<string, string | null>;

/**
 * Connection entity representation for dynamic dock links.
 */
export interface DockConnection {
  id: string;
  provider: string;
  linkedUsername: string;
  connectionId: string | null;
  createdAt: string;
  expiresAt: string | null;
  private: boolean;
  metadata?: unknown;
}

/**
 * Props for the available shortcuts grid.
 */
export interface RrDockShortcutsGridProps {
  groupedItems: Record<string, SidebarItem[]>;
  tempPositions: DockPositions;
  focusedSlot: string | null;
  onSelectItem: (itemKey: string) => void;
  userPermissions?: number[];
}
