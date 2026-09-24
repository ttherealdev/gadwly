import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

const categoryEnum = z.enum(["CENTER", "STUDY", "PROJECT", "SPORT", "REST"]);
const dayEnum = z.enum(["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"]);
const statusEnum = z.enum(["PLANNED", "IN_PROGRESS", "DONE"]);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const upsertInput = z.object({
  id: z.string().optional(),
  day: dayEnum,
  title: z.string().min(1).max(120),
  category: categoryEnum,
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  status: statusEnum.default("PLANNED"),
  notes: z.string().max(2000).optional(),
  color: z.string().optional(),
});

export const scheduleRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.scheduleItem.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    })
  ),

  upsert: protectedProcedure.input(upsertInput).mutation(({ ctx, input }) => {
    const { id, ...data } = input;
    if (id) {
      return ctx.db.scheduleItem.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }
    return ctx.db.scheduleItem.create({
      data: { ...data, userId: ctx.session.user.id },
    });
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: statusEnum }))
    .mutation(({ ctx, input }) =>
      ctx.db.scheduleItem.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { status: input.status },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.scheduleItem.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      })
    ),
});
