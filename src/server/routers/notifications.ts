import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { sendPushToUser } from "@/lib/push";

export const notificationsRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
        userAgent: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.db.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: {
          userId: ctx.session.user.id,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
        update: {
          userId: ctx.session.user.id,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent,
        },
      })
    ),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(({ ctx, input }) =>
      ctx.db.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.session.user.id },
      })
    ),

  status: protectedProcedure
    .input(z.object({ endpoint: z.string().url().optional() }))
    .query(({ ctx, input }) => {
      if (!input.endpoint) return { subscribed: false };
      return ctx.db.pushSubscription
        .findUnique({ where: { endpoint: input.endpoint } })
        .then((s) => ({ subscribed: !!s && s.userId === ctx.session.user.id }));
    }),

  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await ctx.db.pushSubscription.count({ where: { userId: ctx.session.user.id } });
    if (count === 0) {
      return { ok: false, reason: "no-subscription" as const };
    }
    await sendPushToUser(ctx.session.user.id, {
      title: "تجربة الإشعارات 🔔",
      body: "لو شايف الرسالة دي، الإشعارات شغالة تمام.",
      tag: "test-notification",
      url: "/gadwly",
    });
    return { ok: true, reason: null };
  }),
});
