import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { toTRPCError } from "../../lib/trpc-errors";

const categoryEnum = z.enum(["CENTER", "STUDY", "PROJECT", "SPORT", "REST"]);
const dayEnum = z.enum(["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"]);
const statusEnum = z.enum(["PLANNED", "IN_PROGRESS", "DONE"]);
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const upsertInput = z.object({
  id: z.string().uuid(),
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

  upsert: protectedProcedure.input(upsertInput).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    try {
      return await ctx.db.scheduleItem.upsert({
        where: { id_userId: { id, userId: ctx.session.user.id } },
        create: { id, ...data, userId: ctx.session.user.id },
        update: data,
      });
    } catch (e) {
      throw toTRPCError(e);
    }
  }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: statusEnum }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.scheduleItem.update({
          where: { id_userId: { id: input.id, userId: ctx.session.user.id } },
          data: { status: input.status },
        });
      } catch (e) {
        throw toTRPCError(e);
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.scheduleItem.delete({
          where: { id_userId: { id: input.id, userId: ctx.session.user.id } },
        });
      } catch (e) {
        throw toTRPCError(e);
      }
    }),
});
