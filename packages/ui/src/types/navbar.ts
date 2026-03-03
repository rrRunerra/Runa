import { ReactNode } from "react";

export type UserRole = "ADMIN" | "USER";

export interface NavChildItem {
  label: string;
  icon?: ReactNode;
  href: string;
  subtitle?: string;
  badge?: string;
  role?: UserRole;
}

export interface NavItem {
  label: string;
  icon?: ReactNode;
  href: string;
  subtitle?: string;
  badge?: string;
  children?: NavChildItem[];
  role?: UserRole;
  preventRedirect?: boolean;
}

export interface NavSection {
  section: string;
  items: NavItem[];
  role?: UserRole;
}

export type NavbarConfig = NavSection[];
