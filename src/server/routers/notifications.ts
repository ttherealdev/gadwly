import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

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
});
