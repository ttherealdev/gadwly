import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { toTRPCError } from "../../lib/trpc-errors";

export const pomodoroRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        label: z.string().optional(),
        focusMin: z.number().int().positive().max(180),
        breakMin: z.number().int().positive().max(60),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.pomodoroSession.upsert({
          where: { id_userId: { id: input.id, userId: ctx.session.user.id } },
          create: { ...input, userId: ctx.session.user.id },
          update: {}, // idempotent replay of the same start, no-op
        });
      } catch (e) {
        throw toTRPCError(e);
      }
    }),

  finish: protectedProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.pomodoroSession.updateMany({
          where: { id: input.id, userId: ctx.session.user.id, endedAt: null },
          data: { completed: input.completed, endedAt: new Date() },
        });
      } catch (e) {
        throw toTRPCError(e);
      }
    }),

  todayCount: protectedProcedure.query(async ({ ctx }) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ctx.db.pomodoroSession.count({
      where: { userId: ctx.session.user.id, completed: true, startedAt: { gte: start } },
    });
  }),
});
