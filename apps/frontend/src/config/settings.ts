import { User, ShieldCheck, KeyRound, Mail, Link2, Lock, Smartphone, List, LucideIcon, Sparkles, Radio } from "lucide-react";

export interface SettingCategory {
  id: string;
  name: string;
  label: string;
  badge: string;
  icon: LucideIcon;
  app?: string;
}

export const settingsNavConfig: SettingCategory[] = [
  { id: "account", name: "Account Settings", label: "Account", badge: "Profile details", icon: User, app: "Polaris" },
  { id: "security", name: "Security Settings", label: "Security", badge: "Passkeys and logs", icon: ShieldCheck, app: "Polaris" },
  { id: "apiKeys", name: "API Keys Settings", label: "API Keys", badge: "Developer credentials", icon: KeyRound, app: "Polaris" },
  { id: "connections", name: "Connections Settings", label: "Connections", badge: "External social linkings", icon: Link2, app: "Polaris" },
  { id: "privacy", name: "Privacy Settings", label: "Privacy", badge: "Personal data", icon: Lock, app: "Polaris" },
  { id: "dock", name: "Dock Settings", label: "Dock", badge: "Mobile dock configurations", icon: Smartphone, app: "Polaris" },
  { id: "mailAccounts", name: "Mail Accounts Settings", label: "Mail Accounts", badge: "Pegasus inbox linkings", icon: Mail, app: "Pegasus" },
  { id: "lists", name: "Lists Settings", label: "Lists", badge: "Import and export media lists", icon: List, app: "Aquila" },
  { id: "arrServices", name: "Arr Services Settings", label: "Arr Services", badge: "Sonarr & Radarr output filters", icon: Radio, app: "Aquila" },
  { id: "constellation", name: "Constellation Settings", label: "Lacerta Drop constellation", badge: "Customize your device constellation", icon: Sparkles, app: "Lacerta" },
];
