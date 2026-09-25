import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const preferencesRouter = router({
  get: protectedProcedure.query(({ ctx }) =>
    ctx.db.userPreference.findUnique({ where: { userId: ctx.session.user.id } })
  ),

  updateLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        cityLabel: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.db.userPreference.upsert({
        where: { userId: ctx.session.user.id },
        create: { userId: ctx.session.user.id, ...input },
        update: input,
      })
    ),
});
