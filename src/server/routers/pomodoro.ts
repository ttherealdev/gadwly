import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const pomodoroRouter = router({
  start: protectedProcedure
    .input(z.object({ label: z.string().optional(), focusMin: z.number().int().positive(), breakMin: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      ctx.db.pomodoroSession.create({ data: { ...input, userId: ctx.session.user.id } })
    ),

  finish: protectedProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.pomodoroSession.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { completed: input.completed, endedAt: new Date() },
      })
    ),

  todayCount: protectedProcedure.query(async ({ ctx }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ctx.db.pomodoroSession.count({
      where: { userId: ctx.session.user.id, completed: true, startedAt: { gte: start } },
    });
  }),
});
