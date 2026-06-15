import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSafeImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    if (url.toLowerCase().includes("javascript:")) {
      return "";
    }
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${process.env.NEXT_PUBLIC_API_URL || ""}${path}`;
};

