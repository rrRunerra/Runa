import { ReactNode } from "react";

export interface NavChildItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  component?: ReactNode;
  preventRedirect?: boolean;
  subtitle?: string;
  badge?: string;
  permission?: bigint | bigint[];
  permissionOperator?: "all" | "any";
}

export interface NavItem {
  label: string;
  icon?: ReactNode;
  href?: string;
  component?: ReactNode;
  subtitle?: string;
  badge?: string;
  children?: NavChildItem[];
  permission?: bigint | bigint[];
  permissionOperator?: "all" | "any";
  preventRedirect?: boolean;
  position?: number;
}

export interface NavSection {
  section: string;
  items: NavItem[];
  permission?: bigint | bigint[];
  permissionOperator?: "all" | "any";
}

export type NavbarConfig = NavSection[];
