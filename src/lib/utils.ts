import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "HH:mm" + "HH:mm" -> "3 ساعات 30 دقيقة" (ar) / "3h 30m" (en) */
export function formatDuration(start: string, end: string, locale: "ar" | "en") {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin < startMin) endMin += 24 * 60;
  const diff = endMin - startMin;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;

  if (locale === "ar") {
    const parts = [];
    if (hrs) parts.push(`${hrs} ${hrs === 1 ? "ساعة" : "ساعات"}`);
    if (mins) parts.push(`${mins} دقيقة`);
    return parts.join(" و") || "٠ دقيقة";
  }
  const parts = [];
  if (hrs) parts.push(`${hrs}h`);
  if (mins) parts.push(`${mins}m`);
  return parts.join(" ") || "0m";
}

/**
 * Human, low-precision distance to a target date — the whole point being
 * to avoid a nagging exact day-count. Returns a translation key + params
 * for the caller to format via next-intl.
 */
export function humanTimeUntil(target: Date, now = new Date()) {
  const msPerDay = 86_400_000;
  const days = Math.ceil((target.getTime() - now.getTime()) / msPerDay);

  if (days <= 0) return { unit: "today" as const };
  if (days <= 10) return { unit: "days" as const, value: days };
  if (days <= 45) return { unit: "weeks" as const, value: Math.round(days / 7) };

  const months = target.getMonth() - now.getMonth() + 12 * (target.getFullYear() - now.getFullYear());
  const dayOfMonth = target.getDate();
  const half: "early" | "mid" | "late" = dayOfMonth <= 10 ? "early" : dayOfMonth <= 20 ? "mid" : "late";
  return { unit: "months" as const, value: months, half };
}
