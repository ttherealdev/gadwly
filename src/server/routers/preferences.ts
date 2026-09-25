import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// setExamTarget / getExamTarget used to live here, back when ExamTarget.userId
// was @unique (one exam per user). That constraint was removed so a user can
// track several exams — that's now owned entirely by examsRouter
// (list/upsert/delete). Re-adding a userId-keyed "set the exam target" here
// would silently conflict with that: which of a user's several rows would it
// even mean? If you need this specific endpoint back, say what it should do
// when a user already has more than one exam.
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
      ctx.db.userPreference.update({
        where: { userId: ctx.session.user.id },
        data: input,
      })
    ),
});
