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
