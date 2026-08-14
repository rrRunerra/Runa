import type React from "react";

/**
 * Three distinct privacy visibility tiers for profile, lists, and integrations.
 */
export type PrivacyLevel = "public" | "friends" | "private";

/**
 * Supported Runa app identifiers containing privacy configurations.
 */
export type PrivacyAppId = "aquila" | "polaris" | "lynx";

/**
 * Metadata definition for a configurable privacy setting item.
 */
export interface PrivacySettingItem {
  /** Unique setting key matching database / API payload */
  id: string;
  /** Primary Runa application sub-tab */
  app: PrivacyAppId;
  /** Localization key for item title */
  titleKey: string;
  /** Localization key for item description (optional) */
  descKey?: string;
  /** Icon component representing this setting */
  icon: React.ComponentType<{ className?: string }>;
  /** Accent color styling for icon badge */
  accentColor: string;
}

/**
 * Common props passed to each privacy sub-tab component.
 */
export interface PrivacySubTabProps {
  /** Current privacy levels dictionary */
  privacyState: Record<string, PrivacyLevel>;
  /** Callback fired when the visibility level of any item is changed */
  onLevelChange: (id: string, level: PrivacyLevel) => void;
  /** Whether controls should be disabled (e.g. while saving) */
  disabled?: boolean;
}
