import { Circle, CircleDot, CheckCircle2 } from "lucide-react";


// Shared between the list and grid schedule views.
export const DAYS = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"] as const;
export type Day = (typeof DAYS)[number];

export const CATEGORIES = ["CENTER", "STUDY", "PROJECT", "SPORT", "REST"] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["PLANNED", "IN_PROGRESS", "DONE"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORY_VAR: Record<Category, string> = {
  CENTER: "var(--cat-center)",
  STUDY: "var(--cat-study)",
  PROJECT: "var(--cat-project)",
  SPORT: "var(--cat-sport)",
  REST: "var(--cat-rest)",
};

export const CATEGORY_DOT: Record<Category, string> = {
  CENTER: "bg-[var(--cat-center)]",
  STUDY: "bg-[var(--cat-study)]",
  PROJECT: "bg-[var(--cat-project)]",
  SPORT: "bg-[var(--cat-sport)]",
  REST: "bg-[var(--cat-rest)]",
};

export type ScheduleItemDTO = {
  id: string;
  day: Day;
  title: string;
  category: Category;
  startTime: string;
  endTime: string;
  status: Status;
  notes: string | null;
};

// icon: shown next to the item title in the grid (DONE) and as the pill icon in the list view.
// textClass / dotClass: grid view — the DONE checkmark color and the IN_PROGRESS pulsing dot color.
// pillClass: list view — the full status-pill background + text color.
export const STATUS_META = {
  PLANNED: {
    icon: Circle,
    textClass: "text-muted-foreground",
    dotClass: "bg-muted-foreground",
    pillClass: "bg-muted text-muted-foreground hover:bg-secondary",
  },
  IN_PROGRESS: {
    icon: CircleDot,
    textClass: "text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
    pillClass: "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400",
  },
  DONE: {
    icon: CheckCircle2,
    textClass: "text-accent-green",
    dotClass: "bg-accent-green",
    pillClass: "bg-accent-green/15 text-accent-green hover:bg-accent-green/25",
  },
} as const;
