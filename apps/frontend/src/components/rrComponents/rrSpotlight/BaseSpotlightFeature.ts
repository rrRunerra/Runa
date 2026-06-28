import React from "react";

export interface SpotlightParameter {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string; icon?: React.ReactNode }[];
  autoCompleteSuggestions?: string[];
}

export interface SpotlightAction {
  id: string;
  label: string;
  category: "Applications" | "Navigation" | "Actions" | "Clipboard" | "Calculator";
  icon: React.ReactNode;
  badge?: string;
  shortcut?: string;
  parameters?: SpotlightParameter[];
  action: (params?: Record<string, any>, context?: SpotlightActionContext) => void | Promise<void>;
  preview?: (params?: Record<string, any>) => React.ReactNode;
}

export interface SpotlightActionContext {
  accessToken?: string;
  username?: string;
  pathname: string;
  searchQuery?: string; // Real-time search query typed in the Spotlight input
  clipboardHistory: string[];
  isE2eeUnlocked: boolean;
  userPermissions?: number[];
  openPreview: (content: React.ReactNode) => void;
  openParameters: (
    actionId: string,
    parameters: SpotlightParameter[],
    onSubmit: (params: Record<string, any>) => void
  ) => void;
  triggerSettingsTab: (category: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: string) => void;
  signOut: () => void;
  setShowUnlockDialog: (show: boolean) => void;
  setSearchResults?: (results: any[] | null) => void;
  setSearchLoading?: (loading: boolean) => void;
  setBaseTheme?: (theme: string) => void;
}

export abstract class BaseSpotlightFeature {
  abstract id: string;
  abstract name: string;
  abstract getActions(
    context: SpotlightActionContext
  ): SpotlightAction[] | Promise<SpotlightAction[]>;
}
