import { router } from "../trpc";
import { scheduleRouter } from "./schedule";
import { pomodoroRouter } from "./pomodoro";
import { preferencesRouter } from "./preferences";
import { examsRouter } from "./exams";

export const appRouter = router({
  schedule: scheduleRouter,
  pomodoro: pomodoroRouter,
  preferences: preferencesRouter,
  exams: examsRouter,
});

export type AppRouter = typeof appRouter;
