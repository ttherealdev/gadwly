import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

const upsertInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(60),
  targetDate: z.coerce.date(),
});

export const examsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.examTarget.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { targetDate: "asc" },
    })
  ),

  upsert: protectedProcedure.input(upsertInput).mutation(({ ctx, input }) => {
    const { id, ...data } = input;
    if (id) {
      return ctx.db.examTarget.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }
    return ctx.db.examTarget.create({
      data: { ...data, userId: ctx.session.user.id },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.examTarget.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),
});
