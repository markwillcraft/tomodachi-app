import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Integers in the UI. Fixed `en-US` locale so the same HTML is produced
 * during RSC/SSR and browser hydration—`n.toLocaleString()` without a
 * locale can differ between Node and the client and triggers React
 * #418 "Hydration failed because the server rendered text didn't match".
 */
export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Compact "5m ago" / "2h ago" / "3d ago" style timestamp. Pure
 * function — caller must decide WHEN to call it. Components that
 * render time-since-now in SSR risk hydration mismatch (server clock
 * != client clock); the convention in this codebase is to defer
 * those reads to a `useEffect` and re-render on a 60s tick.
 */
export function formatTimeAgo(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}
