import { User, ShieldCheck, KeyRound, Mail, Link2, Lock, Smartphone, List, LucideIcon, Sparkles, Radio } from "lucide-react";

export interface SettingCategory {
  id: string;
  name: string;
  label: string;
  badge: string;
  icon: LucideIcon;
  visibleOn?: string[];
}

export const settingsNavConfig: SettingCategory[] = [
  { id: "account", name: "Account Settings", label: "Account", badge: "Profile details", icon: User },
  { id: "security", name: "Security Settings", label: "Security", badge: "Passkeys and logs", icon: ShieldCheck },
  { id: "apiKeys", name: "API Keys Settings", label: "API Keys", badge: "Developer credentials", icon: KeyRound },
  { id: "mailAccounts", name: "Mail Accounts Settings", label: "Mail Accounts", badge: "Pegasus inbox linkings", icon: Mail, visibleOn: ["/pegasus"] },
  { id: "connections", name: "Connections Settings", label: "Connections", badge: "External social linkings", icon: Link2 },
  { id: "privacy", name: "Privacy Settings", label: "Privacy", badge: "Personal data", icon: Lock },
  { id: "sidebar", name: "Sidebar Shortcuts", label: "Sidebar Shortcuts", badge: "Mobile sidebar configurations", icon: Smartphone },
  { id: "lists", name: "Lists Settings", label: "Lists", badge: "Import and export media lists", icon: List, visibleOn: ["/aquila"] },
  { id: "arrServices", name: "Arr Services Settings", label: "Arr Services", badge: "Sonarr & Radarr output filters", icon: Radio, visibleOn: ["/aquila"] },
  { id: "constellation", name: "Constellation Settings", label: "Lacerta Drop constellation", badge: "Customize your device constellation", icon: Sparkles, visibleOn: ["/lacerta"] },
];
