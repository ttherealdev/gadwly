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

  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        prayerNotifyEnabled: z.boolean().optional(),
        notifyFajr: z.boolean().optional(),
        notifyDhuhr: z.boolean().optional(),
        notifyAsr: z.boolean().optional(),
        notifyMaghrib: z.boolean().optional(),
        notifyIsha: z.boolean().optional(),
        pomodoroNotifyEnabled: z.boolean().optional(),
        notificationSoundOn: z.boolean().optional(),
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
