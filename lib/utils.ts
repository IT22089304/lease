import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toDateString(date: any) {
  if (!date) return "";
  if (typeof date === "string") {
    const d = new Date(date);
    return isNaN(d.getTime()) ? date : d.toLocaleDateString();
  }
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  if (date.toDate) {
    try {
      return date.toDate().toLocaleDateString();
    } catch {
      return "";
    }
  }
  return "";
}
