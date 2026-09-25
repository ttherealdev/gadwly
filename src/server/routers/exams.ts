import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { toTRPCError } from "../../lib/trpc-errors";

const upsertInput = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(60),
  targetDate: z.coerce.date(),
});

const labelKeyOf = (label: string) => label.trim().toLowerCase();

export const examsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.examTarget.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { targetDate: "asc" },
    })
  ),

  upsert: protectedProcedure.input(upsertInput).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const labelKey = labelKeyOf(data.label);
    try {
      return await ctx.db.examTarget.upsert({
        where: { id_userId: { id, userId: ctx.session.user.id } },
        create: { id, ...data, labelKey, userId: ctx.session.user.id },
        update: { ...data, labelKey },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new TRPCError({ code: "CONFLICT", message: "DUPLICATE_EXAM" });
      }
      throw toTRPCError(e);
    }
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.examTarget.delete({
          where: { id_userId: { id: input.id, userId: ctx.session.user.id } },
        });
      } catch (e) {
        throw toTRPCError(e);
      }
    }),
});
