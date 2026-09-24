import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const preferencesRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    ctx.db.userPreference.findUnique({ where: { userId: ctx.session.user.id } })
  ),

  updateLocation: protectedProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number(), cityLabel: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.userPreference.update({
        where: { userId: ctx.session.user.id },
        data: input,
      })
    ),

  setExamTarget: protectedProcedure
    .input(z.object({ label: z.string().min(1).max(60), targetDate: z.coerce.date() }))
    .mutation(({ ctx, input }) =>
      ctx.db.examTarget.upsert({
        where: { userId: ctx.session.user.id },
        create: { ...input, userId: ctx.session.user.id },
        update: input,
      })
    ),

  getExamTarget: protectedProcedure.query(({ ctx }) =>
    ctx.db.examTarget.findUnique({ where: { userId: ctx.session.user.id } })
  ),
});
