import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { firebaseConfigured, messaging } from "@/lib/firebase-admin";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT; // NOTE: "mailto:you@example.com" dont forget

if (publicKey && privateKey && subject) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type PushPayload = {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
  silent?: boolean;
  icon?: string;
  channelId?: string;
};

async function sendWebPush(
  sub: { id: string; endpoint: string; p256dh: string | null; auth: string | null },
  payload: PushPayload
) {
  if (!publicKey || !privateKey || !subject || !sub.p256dh || !sub.auth) return;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      console.error("[push] web send failed:", err);
    }
  }
}

async function sendFcm(sub: { id: string; endpoint: string }, payload: PushPayload) {
  if (!firebaseConfigured) {
    console.warn("[push] Firebase Admin not configured — skipping Android send.");
    return;
  }
  try {
    await messaging().send({
      token: sub.endpoint,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url ?? "/gadwly" },
      android: {
        notification: {
          channelId: payload.channelId ?? "default",
          sound: payload.silent ? undefined : "adhan",
          tag: payload.tag,
        },
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "messaging/registration-token-not-registered") {
      await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      console.error("[push] FCM send failed:", err);
    }
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  await Promise.all(
    subs.map((sub) => (sub.platform === "android" ? sendFcm(sub, payload) : sendWebPush(sub, payload)))
  );
}
