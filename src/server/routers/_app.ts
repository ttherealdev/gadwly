import { router } from "../trpc";
import { scheduleRouter } from "./schedule";
import { pomodoroRouter } from "./pomodoro";
import { preferencesRouter } from "./preferences";

export const appRouter = router({
  schedule: scheduleRouter,
  pomodoro: pomodoroRouter,
  preferences: preferencesRouter,
});

export type AppRouter = typeof appRouter;
