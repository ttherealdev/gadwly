import { router } from "../trpc";
import { scheduleRouter } from "./schedule";
import { pomodoroRouter } from "./pomodoro";
import { preferencesRouter } from "./preferences";
import { examsRouter } from "./exams";
import { notificationsRouter } from "./notifications";

export const appRouter = router({
  schedule: scheduleRouter,
  pomodoro: pomodoroRouter,
  preferences: preferencesRouter,
  exams: examsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
